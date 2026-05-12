import { BlurView } from "expo-blur";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useEffect, useState } from "react";
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
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const appStateSub = AppState.addEventListener("change", setAppState);

    const toastTimer: ReturnType<typeof setTimeout> | undefined = undefined;

    return () => {
      appStateSub.remove();
      if (toastTimer) clearTimeout(toastTimer);
    };
  }, []);

  const shouldBlur = appState === "background" || appState === "inactive";

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
