import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center p-5 bg-background">
        <Text className="text-lg font-bold text-text">
          This screen doesn't exist.
        </Text>

        <Link href="/">
          <Text className="mt-4 py-3 text-sm text-blue-600">
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}

/*
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
    color: '#2e78b7',
  },
});
*/
