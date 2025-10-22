import { useColorScheme } from "@/components/useColorScheme";
import { useAuth } from "@/context/AuthContext";
import { signup } from "@/lib/api/auth";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
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

export default function SignupScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const scheme = colorScheme ?? "light";
  const logoSource = useMemo(() => {
    return scheme === "dark"
      ? require("../../assets/images/af-logo-light.png")
      : require("../../assets/images/af-logo-dark.png");
  }, [scheme]);

  const validateEmail = (value: string) => {
    return /\S+@\S+\.\S+/.test(value);
  };

  const onSubmit = useCallback(async () => {
    console.log("🚀 Signup onSubmit called");
    console.log("Username:", username);
    console.log("Email:", email);
    console.log("Password length:", password.length);
    console.log("Gender:", gender);

    if (!username || !email || !password || !confirmPassword) {
      console.log("❌ Validation failed: missing fields");
      Alert.alert("Missing fields", "Please fill all required fields.");
      return;
    }

    if (!validateEmail(email)) {
      console.log("❌ Validation failed: invalid email");
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      console.log("❌ Validation failed: weak password");
      Alert.alert("Weak password", "Password should be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      console.log("❌ Validation failed: password mismatch");
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    if (!consent) {
      console.log("❌ Validation failed: consent not given");
      Alert.alert(
        "Consent required",
        "You must agree to the Terms of use & Privacy Policy to create an account."
      );
      return;
    }

    setLoading(true);

    try {
      console.log("📡 Calling signup API...");
      const response = await signup({
        username,
        email,
        password,
        gender,
      });

      console.log("📡 Signup API response received:", response);

      if (response.success) {
        console.log("✅ Signup successful, signing in user");
        signIn(response.data.user, response.data.token);
        router.replace("/");
      } else {
        console.log("❌ Signup failed with message:", response.message);
        Alert.alert("Signup failed", response.message);
      }
    } catch (err) {
      console.error("❌ Signup error caught:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Please try again later.";
      Alert.alert("Signup failed", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [username, email, password, confirmPassword, consent, signIn, router]);

  const navigateToLogin = useCallback(() => {
    router.push("/auth/login");
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
      <View className="border-b border-border bg-background px-4 dark:border-border-dark dark:bg-background-dark">
        <View className="mx-auto w-full max-w-5xl flex-row items-center justify-between py-2">
          <Image
            source={logoSource}
            style={{ height: 36, width: 120, resizeMode: "contain" }}
            accessibilityRole="image"
            accessibilityLabel="Arewaflix"
          />
          <Pressable
            onPress={navigateToLogin}
            className="rounded-full border border-primary px-5 py-2 dark:border-primary-dark"
          >
            <Text className="text-sm font-semibold uppercase tracking-wide text-primary dark:text-primary-dark">
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
          <View className="flex-1 items-center px-4 py-8">
            {/* Main Card Container */}
            <View className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-lg dark:bg-gray-800">
              <View className="flex-row">
                {/* Left Side - Signup Form */}
                <View className="flex-1 p-8 lg:p-12">
                  <Text className="mb-8 text-3xl font-bold text-text dark:text-text-dark">
                    Create an account
                  </Text>

                  {/* Username */}
                  <View className="mb-4">
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Username"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      className="rounded-lg border border-gray-300 bg-white px-4 py-3.5 text-base text-text dark:border-gray-600 dark:bg-gray-700 dark:text-text-dark"
                    />
                    <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                      Username
                    </Text>
                  </View>

                  {/* Email */}
                  <View className="mb-4">
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

                  {/* Password */}
                  <View className="mb-4">
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      className="rounded-lg border border-gray-300 bg-white px-4 py-3.5 text-base text-text dark:border-gray-600 dark:bg-gray-700 dark:text-text-dark"
                    />
                    <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                      Password
                    </Text>
                  </View>

                  {/* Confirm Password */}
                  <View className="mb-4">
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm password"
                      placeholderTextColor="#9ca3af"
                      secureTextEntry
                      className="rounded-lg border border-gray-300 bg-white px-4 py-3.5 text-base text-text dark:border-gray-600 dark:bg-gray-700 dark:text-text-dark"
                    />
                    <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                      Confirm password
                    </Text>
                  </View>

                  {/* Gender */}
                  <View className="mb-4">
                    <Text className="mb-2 text-sm font-medium text-muted dark:text-muted-dark">
                      Gender
                    </Text>
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={() => setGender("male")}
                        className={`rounded-full border px-4 py-2 ${gender === "male" ? "border-primary bg-primary/10" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"}`}
                      >
                        <Text className="text-sm">Male</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setGender("female")}
                        className={`rounded-full border px-4 py-2 ${gender === "female" ? "border-primary bg-primary/10" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"}`}
                      >
                        <Text className="text-sm">Female</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setGender("other")}
                        className={`rounded-full border px-4 py-2 ${gender === "other" ? "border-primary bg-primary/10" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"}`}
                      >
                        <Text className="text-sm">Other</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Consent */}
                  <View className="mb-6">
                    <Pressable
                      onPress={() => setConsent(!consent)}
                      className="flex-row items-start"
                    >
                      <View
                        className={`mr-3 h-5 w-5 items-center justify-center rounded border-2 ${consent ? "border-primary bg-primary dark:border-primary-dark dark:bg-primary-dark" : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"}`}
                      >
                        {consent && (
                          <FontAwesome name="check" size={12} color="white" />
                        )}
                      </View>
                      <Text className="flex-1 text-sm text-muted dark:text-muted-dark">
                        By creating your account, you agree to our{" "}
                        <Text className="font-semibold text-primary">
                          Terms of use
                        </Text>{" "}
                        &{" "}
                        <Text className="font-semibold text-primary">
                          Privacy Policy
                        </Text>
                      </Text>
                    </Pressable>
                  </View>

                  {/* Signup Button */}
                  <Pressable
                    onPress={onSubmit}
                    disabled={loading}
                    className="mb-8 rounded-lg bg-primary px-6 py-4 dark:bg-primary-dark"
                  >
                    <Text className="text-center text-base font-bold uppercase tracking-wide text-white">
                      {loading ? "Please wait..." : "Create account"}
                    </Text>
                  </Pressable>
                </View>

                {/* Right Side - small info panel (hidden on mobile) */}
                <View className="hidden w-80 items-center justify-center bg-primary/10 p-8 dark:bg-primary-dark/10 lg:flex">
                  <View className="items-center">
                    <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-primary/20 dark:bg-primary-dark/20">
                      <FontAwesome
                        name="user-plus"
                        size={32}
                        className="text-primary"
                      />
                    </View>
                    <Text className="mb-2 text-xl font-bold text-text dark:text-text-dark">
                      Join Arewaflix
                    </Text>
                    <Text className="mb-6 text-center text-sm text-muted dark:text-muted-dark">
                      Create an account to save favorite videos and follow
                      channels.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Mobile sign-in link */}
            <View className="mt-6 lg:hidden">
              <Text className="text-center text-sm text-muted dark:text-muted-dark">
                Already have an account?{" "}
                <Text
                  className="font-semibold text-primary"
                  onPress={navigateToLogin}
                  accessibilityRole="link"
                >
                  Sign in
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
