import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/context/AuthContext";
import { login } from "@/lib/api/auth";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reviewer credentials only in dev mode (never in production)
  const REVIEW_USER = __DEV__
    ? process.env.EXPO_PUBLIC_REVIEW_USERNAME
    : undefined;
  const REVIEW_PASS = __DEV__
    ? process.env.EXPO_PUBLIC_REVIEW_PASSWORD
    : undefined;

  const scheme = colorScheme ?? "light";
  const logoSource = useMemo(() => {
    return scheme === "dark"
      ? require("../../assets/images/af-logo-light.png")
      : require("../../assets/images/af-logo-dark.png");
  }, [scheme]);

  const onSubmit = useCallback(async () => {
    setError(null);

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await login({
        username,
        password,
      });

      if (response.success && response.data) {
        signIn(response.data.user, response.data.token);
        router.replace("/");
      } else {
        // Handle field-specific validation errors
        if (response.errors && Array.isArray(response.errors)) {
          const errorMessages = response.errors
            .map((err) => `${err.field}: ${err.message}`)
            .join("\n");
          setError(errorMessages || "Validation failed. Please try again.");
        } else {
          setError(response.message || "Login failed. Please try again.");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [username, password, signIn, router]);

  const navigateToSignup = useCallback(() => {
    router.push("/auth/signup");
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
            onPress={navigateToSignup}
            className="px-5 py-2 border rounded-full border-primary dark:border-primary-dark"
          >
            <Text className="text-sm font-semibold tracking-wide uppercase text-primary dark:text-primary-dark">
              Register
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
                {/* Left Side - Login Form */}
                <View className="flex-1 p-8 lg:p-12">
                  <Text className="mb-8 text-3xl font-bold text-text dark:text-text-dark">
                    Welcome back!
                  </Text>

                  {/* Error Message */}
                  {error && (
                    <View className="p-4 mb-5 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <Text className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </Text>
                    </View>
                  )}

                  {/* Username Field */}
                  <View className="mb-5">
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Username"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      autoFocus
                      className="rounded-lg border border-gray-300 bg-white px-4 py-3.5 text-base text-text dark:border-gray-600 dark:bg-gray-700 dark:text-text-dark"
                    />
                    <Text className="mt-2 text-sm font-medium text-muted dark:text-muted-dark">
                      Username
                    </Text>
                  </View>

                  {/* Password Field */}
                  <View className="mb-5">
                    <View className="relative">
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        placeholderTextColor="#9ca3af"
                        secureTextEntry={!showPassword}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-3.5 pr-12 text-base text-text dark:border-gray-600 dark:bg-gray-700 dark:text-text-dark"
                      />
                      <Pressable
                        onPress={() => setShowPassword(!showPassword)}
                        className="absolute top-0 right-0 items-center justify-center h-full px-4"
                      >
                        <FontAwesome
                          name={showPassword ? "eye-slash" : "eye"}
                          size={20}
                          color="#9ca3af"
                        />
                      </Pressable>
                    </View>
                    <Text className="mt-2 text-sm font-medium text-muted dark:text-muted-dark">
                      Password
                    </Text>
                  </View>

                  {/* Reviewer autofill (opt-in via EXPO_PUBLIC_REVIEW_USERNAME/PASSWORD) */}
                  {REVIEW_USER && REVIEW_PASS && (
                    <View className="mb-4">
                      <Pressable
                        onPress={() => {
                          setUsername(REVIEW_USER);
                          setPassword(REVIEW_PASS);
                        }}
                        className="px-4 py-3 border border-gray-300 border-dashed rounded-lg bg-gray-50"
                        accessibilityLabel="Use reviewer credentials"
                      >
                        <Text className="text-sm text-center text-muted dark:text-muted-dark">
                          Use reviewer credentials
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Remember Device & Forgot Password */}
                  <View className="flex-row items-center justify-between mb-8">
                    <Pressable
                      onPress={() => setRememberDevice(!rememberDevice)}
                      className="flex-row items-center"
                    >
                      <View
                        className={`mr-2 h-5 w-5 items-center justify-center rounded border-2 ${
                          rememberDevice
                            ? "border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark"
                            : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                        }`}
                      >
                        {rememberDevice && (
                          <FontAwesome name="check" size={12} color="white" />
                        )}
                      </View>
                      <Text className="text-sm text-text dark:text-text-dark">
                        Remember this device
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        router.push("/auth/forgot-password" as any);
                      }}
                    >
                      <Text className="text-sm font-semibold text-primary dark:text-primary-dark">
                        Forgot your password?
                      </Text>
                    </Pressable>
                  </View>

                  {/* Login Button */}
                  <Pressable
                    onPress={onSubmit}
                    disabled={loading}
                    className="px-6 py-4 rounded-lg bg-primary dark:bg-primary-dark"
                  >
                    <Text className="text-base font-bold tracking-wide text-center text-white uppercase">
                      {loading ? "Please wait..." : "Log In"}
                    </Text>
                  </Pressable>

                  {/* Privacy & Terms Footer */}
                  <View className="mt-6">
                    <Text className="text-xs text-center text-muted dark:text-muted-dark">
                      By logging in, you agree to our{" "}
                      <Text
                        className="font-semibold underline text-primary"
                        onPress={() =>
                          WebBrowser.openBrowserAsync(
                            "https://arewaflix.com/terms/terms"
                          )
                        }
                      >
                        Terms of Service
                      </Text>{" "}
                      and{" "}
                      <Text
                        className="font-semibold underline text-primary"
                        onPress={() =>
                          WebBrowser.openBrowserAsync(
                            "https://arewaflix.com/terms/privacy-policy"
                          )
                        }
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Right Side - Marketing Panel (hidden on mobile) */}
                <View className="items-center justify-center hidden p-10 w-80 bg-primary/10 dark:bg-primary-dark/10 lg:flex">
                  <View className="items-center">
                    <View className="items-center justify-center w-16 h-16 mb-4 rounded-full bg-primary/20 dark:bg-primary-dark/20">
                      <FontAwesome
                        name="play"
                        size={32}
                        className="text-primary"
                      />
                    </View>
                    <Text className="mb-2 text-xl font-bold text-text dark:text-text-dark">
                      Stream the best
                    </Text>
                    <Text className="text-sm text-center text-muted dark:text-muted-dark">
                      Discover curated Hausa entertainment, documentaries, and
                      originals.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Mobile sign-up link */}
            <View className="mt-6 lg:hidden">
              <Text className="text-sm text-center text-muted dark:text-muted-dark">
                Don&apos;t have an account?{" "}
                <Text
                  className="font-semibold text-primary"
                  onPress={navigateToSignup}
                  accessibilityRole="link"
                >
                  Sign up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
