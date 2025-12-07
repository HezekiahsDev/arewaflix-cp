import * as TrackingTransparency from "expo-tracking-transparency";
import { Platform } from "react-native";

/**
 * App Tracking Transparency (ATT) Status
 */
export enum TrackingStatus {
  NOT_DETERMINED = "not-determined",
  RESTRICTED = "restricted",
  DENIED = "denied",
  AUTHORIZED = "authorized",
}

/**
 * Request App Tracking Transparency permission from the user.
 * This must be called before collecting any device identifiers or analytics.
 *
 * On iOS 14.5+, this will show a system dialog asking for tracking permission.
 * On Android or older iOS versions, this returns 'authorized' by default.
 *
 * @returns The tracking authorization status
 */
export async function requestTrackingPermission(): Promise<TrackingStatus> {
  // Only iOS requires ATT framework
  if (Platform.OS !== "ios") {
    return TrackingStatus.AUTHORIZED;
  }

  try {
    // Check current status first
    const { status: currentStatus } =
      await TrackingTransparency.getTrackingPermissionsAsync();

    // If already determined (granted or denied), return current status
    if (currentStatus !== TrackingTransparency.PermissionStatus.UNDETERMINED) {
      return mapPermissionStatus(currentStatus);
    }

    // Request permission from the user
    const { status } =
      await TrackingTransparency.requestTrackingPermissionsAsync();

    return mapPermissionStatus(status);
  } catch (error) {
    console.error("Error requesting tracking permission:", error);
    // If there's an error, assume denied to be safe
    return TrackingStatus.DENIED;
  }
}

/**
 * Get the current App Tracking Transparency status without requesting it.
 *
 * @returns The current tracking authorization status
 */
export async function getTrackingStatus(): Promise<TrackingStatus> {
  if (Platform.OS !== "ios") {
    return TrackingStatus.AUTHORIZED;
  }

  try {
    const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
    return mapPermissionStatus(status);
  } catch (error) {
    console.error("Error getting tracking status:", error);
    return TrackingStatus.NOT_DETERMINED;
  }
}

/**
 * Check if tracking is authorized.
 *
 * @returns true if the user has authorized tracking, false otherwise
 */
export async function isTrackingAuthorized(): Promise<boolean> {
  const status = await getTrackingStatus();
  return status === TrackingStatus.AUTHORIZED;
}

/**
 * Map expo-tracking-transparency permission status to our TrackingStatus enum
 */
function mapPermissionStatus(
  status: TrackingTransparency.PermissionStatus
): TrackingStatus {
  switch (status) {
    case TrackingTransparency.PermissionStatus.GRANTED:
      return TrackingStatus.AUTHORIZED;
    case TrackingTransparency.PermissionStatus.DENIED:
      return TrackingStatus.DENIED;
    case TrackingTransparency.PermissionStatus.UNDETERMINED:
      return TrackingStatus.NOT_DETERMINED;
    default:
      // RESTRICTED or unknown
      return TrackingStatus.RESTRICTED;
  }
}

/**
 * Check if we should request tracking permission.
 * This returns true if:
 * - Platform is iOS
 * - Permission has not been determined yet
 *
 * @returns true if we should show the tracking request dialog
 */
export async function shouldRequestTracking(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }

  const status = await getTrackingStatus();
  return status === TrackingStatus.NOT_DETERMINED;
}
