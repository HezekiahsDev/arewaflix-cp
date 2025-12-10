import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  isTrackingAuthorized,
  requestTrackingPermission,
} from "./tracking-transparency";

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
 *
 * IMPORTANT: This function requests App Tracking Transparency (ATT) permission on iOS
 * before generating the fingerprint, as required by Apple's App Store guidelines.
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  try {
    // Request tracking permission on iOS (required for App Store compliance)
    // This will show the ATT dialog if not yet determined
    await requestTrackingPermission();

    // Check if we already have a stored fingerprint
    const stored = await AsyncStorage.getItem(FINGERPRINT_KEY);
    if (stored) {
      return stored;
    }

    // Check if tracking is authorized
    const trackingAuthorized = await isTrackingAuthorized();

    // If tracking is not authorized, do NOT persist a device identifier.
    // Returning null signals callers to skip any tracking that would link
    // this device to other identifiers.
    if (!trackingAuthorized) {
      return null;
    }

    // Generate a new persistent fingerprint and store it
    const installationId =
      Constants.installationId || Constants.sessionId || "unknown";
    const platform = Platform.OS;
    const version = Platform.Version;
    const randomSuffix = Math.random().toString(36).substring(2, 15);

    const fingerprint = `${platform}_${version}_${installationId}_${randomSuffix}`;

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
