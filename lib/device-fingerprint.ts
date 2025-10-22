import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const FINGERPRINT_KEY = "@arewaflix:device_fingerprint";

/**
 * Generate a unique device fingerprint that persists across app sessions.
 * This helps prevent Sybil attacks by ensuring one fingerprint per device installation.
 *
 * The fingerprint is generated once and stored in AsyncStorage. On subsequent calls,
 * the same fingerprint is returned.
 *
 * Fingerprint composition:
 * - installationId from expo-constants (unique per app installation)
 * - Platform OS and version
 * - Random suffix (generated once, stored persistently)
 */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    // Check if we already have a stored fingerprint
    const stored = await AsyncStorage.getItem(FINGERPRINT_KEY);
    if (stored) {
      console.log("[DeviceFingerprint] Using stored fingerprint:", stored);
      return stored;
    }

    // Generate a new fingerprint
    const installationId =
      Constants.installationId || Constants.sessionId || "unknown";
    const platform = Platform.OS;
    const version = Platform.Version;
    const randomSuffix = Math.random().toString(36).substring(2, 15);

    const fingerprint = `${platform}_${version}_${installationId}_${randomSuffix}`;

    console.log("[DeviceFingerprint] Generated new fingerprint:", {
      fingerprint,
      installationId,
      platform,
      version,
    });

    // Store it for future use
    await AsyncStorage.setItem(FINGERPRINT_KEY, fingerprint);

    return fingerprint;
  } catch (error) {
    console.error("Failed to generate device fingerprint:", error);
    // Fallback to a session-based fingerprint if storage fails
    return `fallback_${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Clear the stored device fingerprint (useful for testing or user logout)
 */
export async function clearDeviceFingerprint(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FINGERPRINT_KEY);
  } catch (error) {
    console.error("Failed to clear device fingerprint:", error);
  }
}
