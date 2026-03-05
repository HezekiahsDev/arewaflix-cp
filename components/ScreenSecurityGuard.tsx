import { BlurView } from "expo-blur";
import {
  addScreenshotListener,
  usePreventScreenCapture,
} from "expo-screen-capture";
import { useEffect, useState } from "react";
import {
  AppState,
  AppStateStatus,
  Platform,
  StyleSheet,
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

  useEffect(() => {
    const appStateSub = AppState.addEventListener("change", setAppState);

    let resetTimer: ReturnType<typeof setTimeout> | undefined;
    let captureSub: { remove: () => void } | undefined;
    if (isNative) {
      captureSub = addScreenshotListener(() => {
        setScreenCaptureActive(true);
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => setScreenCaptureActive(false), 1500);
      });
    }

    return () => {
      appStateSub.remove();
      captureSub?.remove();
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, []);

  const shouldBlur =
    appState === "background" || appState === "inactive" || screenCaptureActive;

  if (!shouldBlur) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {isNative ? (
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.fallback} />
      )}
    </View>
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
});

export default ScreenSecurityGuard;
