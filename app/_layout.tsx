import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import "../global.css";

import AppHeader from "@/components/AppHeader";
import Colors from "@/constants/Colors";
import { AuthProvider, useAuth } from "@/context/AuthContext";
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
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { colorScheme, setColorScheme } = useNativewindColorScheme();
  const scheme = colorScheme ?? "light";
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
          {!isAuthRoute && <AppHeader colorScheme={scheme} />}
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
            </Stack>
          </View>
        </SafeAreaView>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
