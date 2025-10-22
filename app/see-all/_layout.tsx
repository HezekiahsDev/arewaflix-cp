import { Stack } from "expo-router";

export default function SeeAllLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackTitle: "Back",
        headerTintColor: "#38bdf8",
        headerStyle: {
          backgroundColor: "transparent",
        },
      }}
    />
  );
}
