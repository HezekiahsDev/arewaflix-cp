import { useColorScheme } from "@/components/useColorScheme";
import { confirmPasswordReset } from "@/lib/api/auth";
import useResetStore from "@/lib/stores/resetStore";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    otp?: string;
    token?: string;
  }>();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const prefilledEmail = typeof params.email === "string" ? params.email : "";

  // Prefer transient store values (set during verify-otp). Fallback to params.
  const storeEmail = useResetStore((s) => s.email);
  const storeOtp = useResetStore((s) => s.otp);
  const storeToken = useResetStore((s) => s.token);
  const clearStore = useResetStore((s) => s.clear);

  const email = storeEmail ?? prefilledEmail;
  const otp = storeOtp ?? (typeof params.otp === "string" ? params.otp : "");
  const token =
    storeToken ?? (typeof params.token === "string" ? params.token : "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrengthLabel, setPasswordStrengthLabel] = useState<
    "" | "Weak" | "Medium" | "Strong"
  >("");
  const [passwordStrengthScore, setPasswordStrengthScore] = useState(0);
  const [showConfirmLast, setShowConfirmLast] = useState(false);
  const confirmLastTimeout = React.useRef<number | null>(null);

  const scheme = colorScheme ?? "light";
  const logoSource = useMemo(() => {
    return scheme === "dark"
      ? require("../../assets/images/af-logo-light.png")
      : require("../../assets/images/af-logo-dark.png");
  }, [scheme]);

  const validateEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

  const computePasswordStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[a-z]/.test(pw)) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    // score 0-5
    let label: "" | "Weak" | "Medium" | "Strong" = "";
    if (score <= 2) label = "Weak";
    else if (score <= 4) label = "Medium";
    else label = "Strong";
    return { score, label };
  };

  const onSubmit = useCallback(async () => {
    setError(null);

    if (!email || !otp || !password || !confirmPassword) {
      setError("Please fill all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError("Password must be 8 to 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await confirmPasswordReset({
        email,
        otp,
        password,
      });
      if (response && response.success) {
        // On success, go back to login
        // Clear transient values
        clearStore();
        router.replace("/auth/login" as any);
      } else {
        setError(response?.message || "Reset failed. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, [email, token, password, confirmPassword, router]);

  // update strength as user types
  React.useEffect(() => {
    if (!password) {
      setPasswordStrengthLabel("");
      setPasswordStrengthScore(0);
      return;
    }
    const { score, label } = computePasswordStrength(password);
    setPasswordStrengthScore(score);
    setPasswordStrengthLabel(label);
  }, [password]);

  // handle confirm input last-char reveal
  const onChangeConfirm = (value: string) => {
    // Clear existing timeout
    if (confirmLastTimeout.current) {
      clearTimeout(confirmLastTimeout.current as any);
      confirmLastTimeout.current = null;
    }
    // If masked mode, briefly reveal last char
    if (!showConfirmPassword && value.length > confirmPassword.length) {
      setShowConfirmLast(true);
      confirmLastTimeout.current = window.setTimeout(() => {
        setShowConfirmLast(false);
        confirmLastTimeout.current = null;
      }, 700);
    }
    setConfirmPassword(value);
  };

  // accessibility: announce inline errors to screen readers
  const inlineAnnouncement =
    error ||
    (password && (password.length < 8 || password.length > 128)
      ? "Password must be 8 to 128 characters."
      : "") ||
    (confirmPassword && password !== confirmPassword
      ? "Passwords do not match."
      : "");

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
                    Set new password
                  </Text>

                  {error && (
                    <View className="p-4 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <Text className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </Text>
                    </View>
                  )}

                  {/* Accessibility live region for inline announcements (screen readers) */}
                  {inlineAnnouncement ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      accessibilityRole="alert"
                      style={{ position: "absolute", left: -10000 }}
                    >
                      {inlineAnnouncement}
                    </Text>
                  ) : null}

                  {/* Email is kept in component state (prefilled from params)
                      but hidden from the UI on this screen. If you need to
                      surface the input again for debugging, re-enable the
                      visible input here. */}
                  <View
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    style={{ height: 0, width: 0, overflow: "hidden" }}
                  />

                  {/* The OTP has already been verified on the previous screen; we only need the new password here. */}

                  <View className="mb-4">
                    <View className="relative">
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="New password"
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
                      New password
                    </Text>
                    {password.length > 0 &&
                      (password.length < 8 || password.length > 128) && (
                        <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
                          Password must be 8 to 128 characters.
                        </Text>
                      )}
                  </View>

                  <View className="mb-4">
                    <View className="relative">
                      {showConfirmPassword ? (
                        <TextInput
                          value={confirmPassword}
                          onChangeText={onChangeConfirm}
                          placeholder="Confirm password"
                          placeholderTextColor="#9ca3af"
                          secureTextEntry={false}
                          className="rounded-lg border border-gray-300 bg-white px-4 py-3.5 pr-12 text-base text-text dark:border-gray-600 dark:bg-gray-700 dark:text-text-dark"
                        />
                      ) : (
                        <>
                          <TextInput
                            value={confirmPassword}
                            onChangeText={onChangeConfirm}
                            keyboardType="default"
                            secureTextEntry={false}
                            className="absolute w-full h-full opacity-0"
                          />
                          <Pressable
                            onPress={() => {
                              /* focus captured by hidden input */
                            }}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-3.5 pr-12 text-base"
                          >
                            <Text className="text-base text-text dark:text-text-dark">
                              {confirmPassword.length === 0
                                ? ""
                                : `${"•".repeat(
                                    Math.max(0, confirmPassword.length - 1)
                                  )}${showConfirmLast ? confirmPassword[confirmPassword.length - 1] : "•"}`}
                            </Text>
                          </Pressable>
                        </>
                      )}

                      <Pressable
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute top-0 right-0 items-center justify-center h-full px-4"
                      >
                        <FontAwesome
                          name={showConfirmPassword ? "eye-slash" : "eye"}
                          size={20}
                          color="#9ca3af"
                        />
                      </Pressable>
                    </View>
                    <Text className="mt-2 text-sm font-medium text-muted dark:text-muted-dark">
                      Confirm password
                    </Text>
                    {confirmPassword.length > 0 &&
                      password !== confirmPassword && (
                        <Text className="mt-1 text-sm text-red-600 dark:text-red-400">
                          Passwords do not match.
                        </Text>
                      )}
                  </View>

                  <Pressable
                    onPress={onSubmit}
                    disabled={loading}
                    className="px-6 py-4 mb-4 rounded-lg bg-primary dark:bg-primary-dark"
                  >
                    <Text className="text-base font-bold tracking-wide text-center text-white uppercase">
                      {loading ? "Please wait..." : "Reset password"}
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
                        name="key"
                        size={32}
                        className="text-primary"
                      />
                    </View>
                    <Text className="mb-2 text-xl font-bold text-text dark:text-text-dark">
                      Secure your account
                    </Text>
                    <Text className="text-sm text-center text-muted dark:text-muted-dark">
                      Choose a new password to restore access to your account.
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
