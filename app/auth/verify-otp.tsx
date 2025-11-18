import { useColorScheme } from "@/components/useColorScheme";
import { requestPasswordReset, verifyOtp } from "@/lib/api/auth";
import useResetStore from "@/lib/stores/resetStore";
import { FontAwesome } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const prefilledEmail = typeof params.email === "string" ? params.email : "";
  const [email] = useState(prefilledEmail);
  const [otp, setOtp] = useState("");
  const otpInputRef = useRef<TextInput | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const setEmail = useResetStore((s) => s.setEmail);
  const setOtpInStore = useResetStore((s) => s.setOtp);
  const setToken = useResetStore((s) => s.setToken);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheme = colorScheme ?? "light";
  const logoSource = useMemo(() => {
    return scheme === "dark"
      ? require("../../assets/images/af-logo-light.png")
      : require("../../assets/images/af-logo-dark.png");
  }, [scheme]);

  const onSubmit = useCallback(async () => {
    setError(null);

    if (!email || !otp) {
      setError("Please provide the code sent to your email.");
      return;
    }

    // OTP must be exactly 6 digits
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6 digit code.");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtp({ email, otp });
      if (response && response.success) {
        // Save email/otp/token in transient store so we don't need to pass OTP in the URL
        setEmail(email);
        setOtpInStore(otp);
        if (response.token) setToken(response.token);
        router.push(`/auth/reset-password` as any);
      } else {
        setError(response?.message || "Verification failed. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }, [email, otp, router]);

  // OTP input: keep only digits up to 6 chars
  const onChangeOtp = useCallback((value: string) => {
    const cleaned = (value || "").replace(/\D/g, "").slice(0, 6);
    setOtp(cleaned);
  }, []);

  // Countdown for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const onResend = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);
    if (!email) {
      setError("Email missing. Go back and re-enter your email.");
      return;
    }
    try {
      setResendCooldown(60);
      const resp = await requestPasswordReset({ email });
      if (resp && resp.success) {
        setSuccessMessage(
          "If an account exists, a new code was sent to the email."
        );
      } else {
        setError(resp?.message || "Failed to resend code.");
        setResendCooldown(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setResendCooldown(0);
    }
  }, [email]);

  const focusOtpInput = useCallback(() => {
    otpInputRef.current?.focus();
  }, []);

  const focusIndex = Math.min(otp.length, 5);

  const keyboardVerticalOffset = useMemo(
    () => (Platform.OS === "ios" ? 24 : 0),
    []
  );

  const navigateToLogin = useCallback(() => {
    router.push("/auth/login" as any);
  }, [router]);

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
                    Enter verification code
                  </Text>

                  {error && (
                    <View className="p-4 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <Text className="text-sm text-red-600 dark:text-red-400">
                        {error}
                      </Text>
                    </View>
                  )}

                  {/* Keep email in state but don't show an editable input */}
                  <View
                    accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    style={{ height: 0, width: 0, overflow: "hidden" }}
                  />

                  <View className="mb-4">
                    {/* Hidden numeric input captures keyboard; visual boxes below show each digit */}
                    <TextInput
                      ref={otpInputRef}
                      value={otp}
                      onChangeText={onChangeOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      importantForAutofill="no"
                      caretHidden={false}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      accessibilityLabel="Enter 6 digit verification code"
                      className="absolute w-0 h-0 opacity-0"
                    />

                    <Pressable
                      onPress={focusOtpInput}
                      className="flex-row justify-center space-x-4"
                    >
                      {Array.from({ length: 6 }).map((_, i) => {
                        const char = otp[i] ?? "";
                        const isActive = isFocused && i === focusIndex;
                        const hasChar = !!char;
                        const base =
                          "w-14 h-16 rounded-lg border items-center justify-center";
                        const emptyLight = "border-gray-300 bg-white";
                        const emptyDark =
                          "dark:border-gray-600 dark:bg-gray-700";
                        const filledLight = "border-primary bg-primary/5";
                        const filledDark =
                          "dark:border-primary-dark dark:bg-primary-dark/5";
                        const activeLight =
                          "border-2 border-primary bg-primary/10";
                        const activeDark =
                          "dark:border-2 dark:border-primary-dark dark:bg-primary-dark/10";
                        const classes = [
                          base,
                          hasChar
                            ? `${filledLight} ${filledDark}`
                            : `${emptyLight} ${emptyDark}`,
                          isActive ? `${activeLight} ${activeDark}` : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <View key={i} className={classes}>
                            <Text className="text-lg font-medium text-text dark:text-text-dark">
                              {hasChar ? "•" : ""}
                            </Text>
                          </View>
                        );
                      })}
                    </Pressable>

                    {/* Resend progress bar */}
                    {resendCooldown > 0 && (
                      <View className="w-full h-1 mt-3 bg-gray-200 rounded-full dark:bg-gray-700">
                        <View
                          style={{
                            width: `${Math.round((resendCooldown / 60) * 100)}%`,
                          }}
                          className="h-1 rounded-full bg-primary dark:bg-primary-dark"
                        />
                      </View>
                    )}

                    <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
                      Verification code
                    </Text>

                    <View className="flex-row items-center justify-between mt-3">
                      <View>
                        {successMessage && (
                          <Text className="text-sm text-green-700 dark:text-green-300">
                            {successMessage}
                          </Text>
                        )}
                      </View>
                      <View className="flex-row items-center space-x-3">
                        <Text className="text-sm text-muted dark:text-muted-dark">
                          {resendCooldown > 0
                            ? `Resend in ${resendCooldown}s`
                            : ""}
                        </Text>
                        <Pressable
                          onPress={onResend}
                          disabled={resendCooldown > 0}
                          className={`px-3 py-2 rounded-md ${resendCooldown > 0 ? "bg-gray-200 dark:bg-gray-700" : "bg-primary dark:bg-primary-dark"}`}
                        >
                          <Text
                            className={`text-sm font-semibold ${resendCooldown > 0 ? "text-gray-500" : "text-white"}`}
                          >
                            Resend
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={onSubmit}
                    disabled={loading}
                    className="px-6 py-4 mb-4 rounded-lg bg-primary dark:bg-primary-dark"
                  >
                    <Text className="text-base font-bold tracking-wide text-center text-white uppercase">
                      {loading ? "Please wait..." : "Verify code"}
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
                      Verify & secure your account
                    </Text>
                    <Text className="text-sm text-center text-muted dark:text-muted-dark">
                      Enter the code we sent to your email to continue.
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
