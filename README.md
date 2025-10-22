# Arewaflix Control Panel

Expo Router application for browsing and managing Arewaflix videos. The project is configured for Android, iOS, and Web targets with NativeWind styling and TypeScript.

## Prerequisites

- Node.js 18 or newer
- npm 9+
- Expo CLI (`npm install -g expo`), or run via `npx expo`
- A running videos service reachable from the device (defaults to `https://api.arewaflix.io`)

## Quick start

```bash
npm install
# Optionally update .env to point at a remote API (see below)
npm run start
```

Choose the **i** key inside Expo CLI to launch the iOS simulator or scan the QR code with the Expo Go app on a physical device.

### Environment variables

The API client reads `EXPO_PUBLIC_API_BASE_URL`. Create a `.env` file if you need to override the default loopback host:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.arewaflix.io
```

When testing on an iOS device, make sure the host is reachable over the network (use your machine’s LAN IP instead of `localhost`).

## iOS support

- `app.json` defines a bundle identifier, build number, icon, splash screen, and App Transport Security exceptions that allow local development over HTTP while keeping production traffic restricted.
- `expo-build-properties` is configured to use static frameworks on iOS, which is required by `react-native-worklets`.
- An `eas.json` profile is included so you can build a development client, preview, or production binary via EAS.

### Running the iOS simulator

```bash
npm run ios
```

On the first launch, Expo will prompt you to install the iOS simulator tools if they are missing.

### Building with EAS

```bash
npx expo login
npx eas build --platform ios --profile development
```

The `production` profile auto-increments the build number. Update the `bundleIdentifier` in `app.json` if you publish under a different organization.

### Troubleshooting

- **Network request failed**: Ensure the videos service is reachable from your device. On iOS, confirm `EXPO_PUBLIC_API_BASE_URL` uses a LAN IP or secure HTTPS endpoint.
- **Asset not found**: Assets are bundled by default via `assetBundlePatterns`. Run `npx expo prebuild` followed by `npx pod-install` if you eject to the bare workflow.
- **EAS build errors about frameworks**: The static framework setting is enabled already; double-check that `node_modules` is fresh (`rm -rf node_modules && npm install`).

## Project structure

- `app/` – Expo Router routes and layouts
- `components/` – Reusable UI building blocks
- `context/` – React context providers (authentication, etc.)
- `lib/` – API client and video formatting utilities
- `assets/` – Icons, fonts, splash artwork

## Scripts

- `npm run start` – Start the Expo development server
- `npm run android` – Launch Android device/emulator
- `npm run ios` – Launch iOS simulator
- `npm run web` – Start the web build target

## Next steps

- Connect real authentication to replace the placeholder context
- Add automated tests for API integrations and UI flows
- Set up CI to run `expo-doctor`, `tsc --noEmit`, and UI tests on pull requests
