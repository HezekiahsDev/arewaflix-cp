import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { Stack } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme ?? "light";

  return (
    <SafeAreaView
      edges={["left", "right"]}
      className={`flex-1 bg-background dark:bg-background-dark`}
      style={{ backgroundColor: Colors[scheme].background }}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack>
    </SafeAreaView>
  );
}
