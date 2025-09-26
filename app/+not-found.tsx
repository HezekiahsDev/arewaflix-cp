import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-background p-5 dark:bg-background-dark">
        <Text className="text-lg font-bold text-text dark:text-text-dark">
          This screen doesn't exist.
        </Text>

        <Link href="/">
          <Text className="mt-4 py-3 text-sm text-primary dark:text-primary-dark">
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
