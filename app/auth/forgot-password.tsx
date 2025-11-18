import { useColorScheme } from "@/components/useColorScheme";
import { requestPasswordReset } from "@/lib/api/auth";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const scheme = colorScheme ?? "light";
  const logoSource = useMemo(() => {
    return scheme === "dark"
      ? require("../../assets/images/af-logo-light.png")
      : require("../../assets/images/af-logo-dark.png");
  }, [scheme]);

  const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const onSubmit = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await requestPasswordReset({ email });
      if (response && response.success) {
        // Move user to the OTP verification screen (we'll collect the OTP there)
        // Pass the email as a query param so the next screen can prefill it
        router.push(
          `/auth/verify-otp?email=${encodeURIComponent(email)}` as any
        );
      } else {
        setError(response?.message || "Request failed. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  const navigateToLogin = useCallback(() => {
    router.push("/auth/login" as any);
  }, [router]);

  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === "ios" ? 24 : 0),
    []
  );

  return (
    <SafeAreaView
      edges={["left", "right"]}
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <View className="px-4 border-b border-border bg-background dark:border-border-dark dark:bg-background-dark">
        <View className="flex-row items-center justify-between w-full max-w-5xl py-2 mx-auto">
          <Image
            source={logoSource}
            style={{ height: 36, width: 120, resizeMode: "contain" }}
            accessibilityRole="image"
            accessibilityLabel="Arewaflix"
          />
          <Pressable
            onPress={navigateToLogin}
            className="px-5 py-2 border rounded-full border-primary dark:border-primary-dark"
          >
            <Text className="text-sm font-semibold tracking-wide uppercase text-primary dark:text-primary-dark">
              Log in
            </Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: Math.max(insets.bottom, 20),
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center flex-1 px-4 py-8">
            <View className="w-full max-w-5xl overflow-hidden bg-white shadow-lg rounded-3xl dark:bg-gray-800">
              <View className="flex-row">
                <View className="flex-1 p-8 lg:p-12">
                  <Text className="mb-4 text-2xl font-bold text-text dark:text-text-dark">
                    Reset your password
                  </Text>

                  {error && (
                    <View className="p-4 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <Text className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </Text>
                    </View>
                  )}

                  {successMessage && (
                    <View className="p-4 mb-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <Text className="text-sm text-green-700 dark:text-green-300">
                        {successMessage}
                      </Text>
                    </View>
                  )}

                  <View className="mb-5">
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="rounded-lg border border-gray-300 bg-white px-4 py-3.5 text-base text-text dark:border-gray-600 dark:bg-gray-700 dark:text-text-dark"
                    />
                    <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                      Email
                    </Text>
                  </View>

                  <Pressable
                    onPress={onSubmit}
                    disabled={loading}
                    className="px-6 py-4 mb-4 rounded-lg bg-primary dark:bg-primary-dark"
                  >
                    <Text className="text-base font-bold tracking-wide text-center text-white uppercase">
                      {loading ? "Please wait..." : "Send reset link"}
                    </Text>
                  </Pressable>

                  <Pressable onPress={navigateToLogin} className="mt-2">
                    <Text className="text-sm text-center text-muted dark:text-muted-dark">
                      Back to login
                    </Text>
                  </Pressable>
                </View>

                <View className="items-center justify-center hidden p-10 w-80 bg-primary/10 dark:bg-primary-dark/10 lg:flex">
                  <View className="items-center">
                    <View className="items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary/20 dark:bg-primary-dark/20">
                      <FontAwesome
                        name="lock"
                        size={32}
                        className="text-primary"
                      />
                    </View>
                    <Text className="mb-2 text-xl font-bold text-text dark:text-text-dark">
                      Forgotten password?
                    </Text>
                    <Text className="text-sm text-center text-muted dark:text-muted-dark">
                      Enter your email and we'll send a link to reset your
                      password.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
