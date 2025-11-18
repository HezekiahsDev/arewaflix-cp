import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Dynamically import expo-notifications at runtime. This avoids throwing during
 * module evaluation in environments where native modules aren't available
 * (server-side rendering or web), which was causing the app layout to fail to
 * load.
 */
async function loadNotificationsModule() {
  if (Platform.OS === "web") return null;

  try {
    // Dynamic import keeps this module safe to require in non-native envs.
    const mod = await import("expo-notifications");
    // Some bundlers/export styles put the API on the default export.
    // Normalize to the module namespace or default export if present.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Notifications: any = (mod && (mod.default ?? mod)) as any;
    return Notifications;
  } catch (e) {
    console.warn("expo-notifications not available:", e);
    return null;
  }
}

// Cache token and in-flight registration promise so multiple components
// calling registerForPushNotificationsAsync concurrently don't show
// multiple permission prompts or duplicate work.
let _cachedExpoPushToken: string | null = null;
let _registerInFlight: Promise<string | null> | null = null;

/**
 * Register for push notifications and return the Expo push token (string) or null.
 * Caller should send the returned token to their backend if present.
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  // Return cached token if we already have one.
  if (_cachedExpoPushToken) return _cachedExpoPushToken;

  // If a registration is already in flight, return the same promise.
  if (_registerInFlight) return _registerInFlight;

  _registerInFlight = (async () => {
    try {
      // Avoid attempting to register on simulators or web where push isn't supported
      if (!Constants.isDevice || Platform.OS === "web") {
        if (!Constants.isDevice) {
          console.warn(
            "Push notifications are not supported on emulators (use a physical device)."
          );
        }
        return null;
      }

      const Notifications: any = await loadNotificationsModule();
      if (!Notifications) return null;

      // Only set the handler at runtime when the module is available.
      try {
        if (typeof Notifications.setNotificationHandler === "function") {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowAlert: true,
              shouldPlaySound: false,
              shouldSetBadge: false,
            }),
          });
        }
      } catch (e) {
        // Non-fatal; some environments may not support handler setup.
        console.warn("Failed to set notification handler:", e);
      }
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // On iOS there is a `provisional` status which allows delivering
      // notifications quietly; treat it as acceptable for obtaining a token.
      const allowedStatuses = ["granted", "provisional"];
      if (!allowedStatuses.includes(finalStatus)) {
        console.warn(
          "Failed to get push token permission (status:",
          finalStatus,
          ")"
        );
        return null;
      }

      let token: string | null = null;
      try {
        const tokenResp = await Notifications.getExpoPushTokenAsync();
        // tokenResp shape is expected to be { data: string }
        token = tokenResp && tokenResp.data ? tokenResp.data : null;
      } catch (e) {
        console.warn("Failed to get Expo push token:", e);
        token = null;
      }

      // On Android, configure notification channel if available
      try {
        if (
          Platform.OS === "android" &&
          typeof Notifications.setNotificationChannelAsync === "function" &&
          Notifications.AndroidImportance
        ) {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          });
        }
      } catch (e) {
        console.warn("Failed to set Android notification channel:", e);
      }

      if (token) {
        _cachedExpoPushToken = token;
      }

      return token;
    } catch (error) {
      console.error("Error registering for push notifications:", error);
      return null;
    } finally {
      // Clear in-flight marker so subsequent calls can retry if needed.
      _registerInFlight = null;
    }
  })();

  return _registerInFlight;
}
