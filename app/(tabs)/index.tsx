import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "react-native";

export default function TabOneScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="text-lg font-bold text-text">Tab One</Text>
      <View className="my-8 h-px w-4/5 bg-gray-200 dark:bg-white/10" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

/*
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
*/
