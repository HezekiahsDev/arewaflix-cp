import { StatusBar } from "expo-status-bar";
import { Platform, Text, View } from "react-native";

import EditScreenInfo from "@/components/EditScreenInfo";

// Modal layout converted to NativeWind className utilities; original StyleSheet commented below

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-lg font-bold text-text">Modal</Text>
      <View className="my-8 h-px w-4/5 bg-gray-200 dark:bg-white/10" />
      <EditScreenInfo path="app/modal.tsx" />

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

/*
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
*/
