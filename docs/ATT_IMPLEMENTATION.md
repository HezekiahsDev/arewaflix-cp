# App Tracking Transparency (ATT) Implementation

## Overview

This app now implements Apple's App Tracking Transparency (ATT) framework as required by the App Store Review Guidelines. The ATT framework ensures user privacy by requiring explicit permission before tracking users or their devices.

## What Was Implemented

### 1. Package Installation

- Installed `expo-tracking-transparency` package
- Added plugin to `app.json` configuration

### 2. Tracking Transparency Module (`lib/tracking-transparency.ts`)

A comprehensive utility module that provides:

- `requestTrackingPermission()` - Request ATT permission from the user
- `getTrackingStatus()` - Get current permission status
- `isTrackingAuthorized()` - Check if tracking is authorized
- `shouldRequestTracking()` - Determine if permission dialog should be shown

### 3. Device Fingerprint Integration

Updated `lib/device-fingerprint.ts` to:

- Request ATT permission before generating device fingerprint
- Generate limited fingerprint if tracking is denied
- Comply with Apple's privacy requirements

### 4. App Configuration

Updated `app.json`:

- Added `expo-tracking-transparency` plugin
- Improved `NSUserTrackingUsageDescription` to be clear and honest about data usage

## How It Works

### User Flow

1. When the app first calls `getDeviceFingerprint()`, it triggers the ATT request
2. User sees a system dialog with your usage description
3. User can choose "Allow" or "Ask App Not to Track"
4. Based on their choice:
   - **Allow**: Full device fingerprint is generated using `Constants.installationId`
   - **Deny**: Limited anonymous fingerprint is generated

### Technical Details

#### On iOS 14.5+

- ATT dialog is shown automatically on first call to `requestTrackingPermission()`
- Permission status is persisted by iOS
- Cannot request again if user denies (must direct them to Settings)

#### On Android or older iOS

- No ATT dialog is shown
- Always returns "authorized" status
- No restrictions on device identifiers

## What Data We Collect

According to the implementation:

- **Device Fingerprint**: A unique identifier for fraud prevention
- **Installation ID**: From expo-constants (only if user allows tracking)
- **Platform Info**: OS type and version
- **Random Suffix**: For uniqueness

### Important Notes:

- ✅ Data is NOT shared with third parties
- ✅ Data is NOT used for advertising
- ✅ Data is used ONLY for fraud prevention (one account per device)
- ✅ User can deny tracking and still use the app

## App Store Compliance

This implementation satisfies Apple's requirements:

1. ✅ **NSUserTrackingUsageDescription** is set in Info.plist (via app.json)
2. ✅ **ATT permission requested** before accessing device identifiers
3. ✅ **Honest description** of data usage (fraud prevention, not advertising)
4. ✅ **Respects user choice** (generates limited fingerprint if denied)

## Usage Examples

### Checking Tracking Status

\`\`\`typescript
import { getTrackingStatus, TrackingStatus } from '@/lib/tracking-transparency';

const status = await getTrackingStatus();
if (status === TrackingStatus.AUTHORIZED) {
console.log('Tracking is authorized');
}
\`\`\`

### Manual Permission Request

\`\`\`typescript
import { requestTrackingPermission } from '@/lib/tracking-transparency';

// Show your own explanation UI, then request permission
const status = await requestTrackingPermission();
console.log('Permission status:', status);
\`\`\`

### Check Before Showing Custom Dialog

\`\`\`typescript
import { shouldRequestTracking } from '@/lib/tracking-transparency';

if (await shouldRequestTracking()) {
// Show your own explanation screen
// Then call requestTrackingPermission()
}
\`\`\`

## Testing

### Test the ATT Dialog

1. Run the app on iOS device or simulator (iOS 14.5+)
2. Navigate to a screen that calls `getDeviceFingerprint()` (e.g., player screen)
3. You should see the ATT permission dialog

### Reset Permission for Testing

\`\`\`bash

# On iOS Simulator

xcrun simctl privacy <device-id> reset all <bundle-id>

# On iOS Device

Settings > Privacy & Security > Tracking > Reset
\`\`\`

### Test Different Permission States

\`\`\`typescript
// Check what happens when user denies
const fingerprint = await getDeviceFingerprint();
console.log('Fingerprint:', fingerprint);
// Should see "anonymous" instead of installationId
\`\`\`

## Building for Production

### Before Submitting to App Store

1. ✅ Ensure `expo-tracking-transparency` is in dependencies
2. ✅ Run `npx expo prebuild` to regenerate native projects
3. ✅ Test on real iOS device
4. ✅ Verify ATT dialog shows with correct message
5. ✅ Build with EAS: `eas build --platform ios`

### EAS Build Configuration

No changes needed to `eas.json` - the plugin handles native configuration automatically.

## Privacy Manifest (iOS 17+)

For iOS 17+, you may also need a Privacy Manifest. Here's what to include:

### Required Reason API Usage

- **NSPrivacyAccessedAPICategoryUserDefaults**: Used for storing device fingerprint
- **NSPrivacyAccessedAPICategorySystemBootTime**: Part of Constants.installationId

The expo-tracking-transparency plugin should handle this automatically.

## Troubleshooting

### Dialog Not Showing

- Make sure you're on iOS 14.5 or later
- Check that `NSUserTrackingUsageDescription` is in app.json
- Verify the plugin is installed: check `package.json`
- Rebuild the app: `npx expo prebuild --clean`

### Permission Already Denied

- User cannot be prompted again from the app
- Direct them to Settings > Privacy & Security > Tracking
- Handle denial gracefully (app still works with limited fingerprint)

### Build Errors

- Run `npx expo install --check` to fix version conflicts
- Clear cache: `npx expo start --clear`
- Rebuild: `npx expo prebuild --clean`

## References

- [Apple ATT Documentation](https://developer.apple.com/documentation/apptrackingtransparency)
- [Expo Tracking Transparency](https://docs.expo.dev/versions/latest/sdk/tracking-transparency/)
- [App Store Review Guidelines - 5.1.2 Data Use and Sharing](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage)

## Migration Notes

If you had previous builds without ATT:

1. Users with existing installs will see the ATT dialog on first update
2. Existing stored fingerprints will remain valid
3. New fingerprints will only be generated after ATT permission is requested
4. No data loss or user impact

## Support

If you encounter issues with App Store Review:

1. Ensure your usage description is honest and accurate
2. If you don't actually track users, consider not requesting the permission at all
3. Provide evidence that device ID is used only for fraud prevention
4. Reference this documentation in your App Review Information notes
