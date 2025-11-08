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
    const Notifications = await import("expo-notifications");
    return Notifications;
  } catch (e) {
    console.warn("expo-notifications not available:", e);
    return null;
  }
}

/**
 * Register for push notifications and return the Expo push token (string) or null.
 * Caller should send the returned token to their backend if present.
 */
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
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

    const Notifications = await loadNotificationsModule();
    if (!Notifications) return null;

    // Only set the handler at runtime when the module is available.
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
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

    if (finalStatus !== "granted") {
      console.warn("Failed to get push token permission");
      return null;
    }

    const tokenResp = await Notifications.getExpoPushTokenAsync();
    const token = tokenResp.data;

    // On Android, configure notification channel if available
    if (Platform.OS === "android" && Notifications.AndroidImportance) {
      try {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      } catch (e) {
        console.warn("Failed to set Android notification channel:", e);
      }
    }

    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}
