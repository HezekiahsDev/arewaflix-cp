import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import "../global.css";

import AppHeader from "@/components/AppHeader";
import { useColorScheme } from "@/components/useColorScheme";
import Colors, { NavigationColors } from "@/constants/Colors";
import { AuthProvider } from "@/context/AuthContext";
import { colorScheme as nativewindColorScheme } from "nativewind";

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
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";

  useEffect(() => {
    nativewindColorScheme.set(scheme);
  }, [scheme]);

  const navigationTheme = useMemo(() => {
    const base = scheme === "dark" ? DarkTheme : DefaultTheme;
    const semantic =
      scheme === "dark" ? NavigationColors.dark : NavigationColors.light;

    return {
      ...base,
      colors: {
        ...base.colors,
        ...semantic.colors,
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
          <AppHeader colorScheme={scheme} />
          <View style={{ flex: 1 }}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: "modal" }} />
              <Stack.Screen
                name="player"
                options={{
                  presentation: "modal",
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
