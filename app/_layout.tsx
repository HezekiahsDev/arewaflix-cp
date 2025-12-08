import "@/lib/disable-console";
import { registerForPushNotificationsAsync } from "@/lib/notifications";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import "../global.css";

import AnimatedSplashScreen from "@/components/AnimatedSplashScreen";
import AppHeader from "@/components/AppHeader";
import Colors from "@/constants/Colors";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FullscreenProvider, useFullscreen } from "@/context/FullscreenContext";
import { useColorScheme as useNativewindColorScheme } from "nativewind";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors if splash screen is already hidden or not available
});
console.debug("RootLayout: called SplashScreen.preventAutoHideAsync");

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      console.debug("RootLayout: fonts loaded");
      // Don't hide splash screen here - let the animated splash handle it
    }
  }, [loaded]);

  const handleSplashFinish = () => {
    console.debug("RootLayout: handleSplashFinish - hiding native splash");
    setShowAnimatedSplash(false);
    // Now hide the native splash screen
    SplashScreen.hideAsync().catch(() => {
      // Ignore errors if splash screen is already hidden
    });
  };

  if (!loaded) {
    return null;
  }

  if (showAnimatedSplash) {
    return <AnimatedSplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <AuthProvider>
      <FullscreenProvider>
        <RootLayoutNav />
      </FullscreenProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { colorScheme, setColorScheme } = useNativewindColorScheme();
  const scheme = colorScheme ?? "light";
  const { isFullscreen } = useFullscreen();
  const pathname = usePathname();
  const isAuthRoute = pathname?.startsWith("/auth");
  // Consider root path (/) or (tabs) index and some tabs as public
  const publicRoutes = new Set([
    "/",
    "",
    "(tabs)",
    "/(tabs)",
    "/shorts",
    "/trending",
    "/search",
    "/categories",
    "/player",
  ]);

  const isPublicRoute = publicRoutes.has(
    // normalize pathname by trimming trailing slash if present
    pathname?.replace(/\/$/, "") ?? ""
  );
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Auth guarding
  // Allow unauthenticated users to access public routes (tabs index, shorts, trending, categories).
  // Only redirect to login when visiting a non-auth, non-public route while unauthenticated.
  useEffect(() => {
    const isProtectedRoute = !isAuthRoute && !isPublicRoute;

    if (!isAuthenticated && isProtectedRoute) {
      router.replace("/auth/login");
    } else if (isAuthenticated && isAuthRoute) {
      // If authenticated users land on auth routes, send them to root
      router.replace("/");
    }
  }, [isAuthenticated, isAuthRoute, isPublicRoute, router]);

  useEffect(() => {
    setColorScheme(scheme);
  }, [scheme, setColorScheme]);

  // Register for push notifications on app start (will prompt the user for permission)
  useEffect(() => {
    (async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          // Expo push token obtained. TODO: send the token to your backend
        }
      } catch (e) {
        console.warn("Push registration failed:", e);
      }
    })();
  }, []);

  // Configure global audio mode so video playback produces sound even when
  // the device is in silent mode (iOS) and to set sensible interruption
  // behavior across platforms. This mirrors the configuration used in the
  // dedicated player screen but must run early so other screens (e.g. Shorts)
  // can play sound too.
  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        });
      } catch (e) {
        // Non-fatal: if audio mode can't be set we don't want to crash the app
        // but logging may help during debugging.
        // eslint-disable-next-line no-console
        console.warn("Failed to set global audio mode:", e);
      }
    })();
  }, []);

  const navigationTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
      },
    } as typeof DefaultTheme;
  }, [scheme]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <SafeAreaView
          edges={["top", "left", "right"]}
          style={{ flex: 1, backgroundColor: Colors[scheme].background }}
        >
          <StatusBar style={Colors[scheme].statusBarStyle} />
          {!isAuthRoute && !isFullscreen && <AppHeader colorScheme={scheme} />}
          <View style={{ flex: 1 }}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: "modal" }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen
                name="player"
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen name="see-all" options={{ headerShown: false }} />
            </Stack>
          </View>
        </SafeAreaView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
