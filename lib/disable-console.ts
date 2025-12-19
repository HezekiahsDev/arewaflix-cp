// Disable console methods in production/non-DEV builds to prevent leaking
// debugging output to user devices and App Store logs.
// This module runs for its side effects when imported.

import Constants from "expo-constants";

declare const __DEV__: boolean;

/**
 * Read `disableConsoleInProd` from app config (app.json expo.extra).
 * Supports common manifest shapes used by Expo.
 */
function readDisableFlagFromConfig(): boolean | undefined {
  try {
    const asAny = Constants as unknown as any;

    const maybeExtra =
      asAny.expoConfig?.extra ??
      asAny.manifest?.extra ??
      asAny.manifest2?.extra ??
      asAny.manifest?.extra;

    if (maybeExtra && typeof maybeExtra.disableConsoleInProd !== "undefined") {
      return Boolean(maybeExtra.disableConsoleInProd);
    }
  } catch (e) {
    // ignore
  }
  return undefined;
}

const disableConsoleInNonDev = () => {
  try {
    const flag = readDisableFlagFromConfig();

    // Default behavior: disable consoles if not DEV and flag !== false.
    const notDev = typeof __DEV__ !== "undefined" ? !__DEV__ : true;

    if (notDev && flag !== false) {
      const noop = () => {};
      const methods = [
        "log",
        "info",
        "warn",
        "error",
        "debug",
        "trace",
      ] as const;

      methods.forEach((m) => {
        // @ts-ignore
        if (
          typeof console !== "undefined" &&
          typeof console[m] === "function"
        ) {
          // @ts-ignore
          console[m] = noop;
        }
      });
    }
  } catch (e) {
    // Fail silently
  }
};

disableConsoleInNonDev();

export {};
