import { BlurView } from "expo-blur";
import {
  addScreenshotListener,
  usePreventScreenCapture,
} from "expo-screen-capture";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

function ScreenSecurityGuard() {
  if (isNative) {
    // Enforces OS-level secure flag to block screenshots and screen recording.
    usePreventScreenCapture();
  }

  const initialAppState = (AppState.currentState ?? "active") as AppStateStatus;
  const [appState, setAppState] = useState<AppStateStatus>(initialAppState);
  const [screenCaptureActive, setScreenCaptureActive] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const lastNoticeRef = useRef(0);

  useEffect(() => {
    const appStateSub = AppState.addEventListener("change", setAppState);

    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    let toastTimer: ReturnType<typeof setTimeout> | undefined;
    let captureSub: { remove: () => void } | undefined;
    if (isNative) {
      captureSub = addScreenshotListener(() => {
        setScreenCaptureActive(true);
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => setScreenCaptureActive(false), 1500);

        const now = Date.now();
        const NOTICE_COOLDOWN_MS = 5000;
        const shouldShow = now - lastNoticeRef.current > NOTICE_COOLDOWN_MS;
        if (shouldShow) {
          lastNoticeRef.current = now;
          setShowToast(true);
          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setShowToast(false), 5000);
        }
      });
    }

    return () => {
      appStateSub.remove();
      captureSub?.remove();
      if (resetTimer) clearTimeout(resetTimer);
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  const shouldBlur =
    appState === "background" || appState === "inactive" || screenCaptureActive;

  return (
    <>
      {shouldBlur && (
        <View style={styles.overlay} pointerEvents="none">
          {isNative ? (
            <BlurView
              intensity={100}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={styles.fallback} />
          )}
        </View>
      )}
      {showToast && (
        <View style={styles.toast} pointerEvents="none">
          <View style={styles.toastInner}>
            <View style={styles.toastDot} />
            <View style={styles.toastContent}>
              <Text style={styles.toastTitle}>Screenshots blocked</Text>
              <Text style={styles.toastMessage}>
                Screenshots and screen recording are disabled for this app.
              </Text>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "rgba(8, 8, 10, 0.65)",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 8, 10, 0.8)",
  },
  toast: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10000,
    alignItems: "center",
  },
  toastInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(18, 18, 22, 0.95)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    width: "100%",
  },
  toastDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#ff6b6b",
    marginRight: 10,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  toastMessage: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});

export default ScreenSecurityGuard;
