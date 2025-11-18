import {
  AboutIcon,
  HelpIcon,
  LanguageIcon,
  SettingsIcon,
  SubscriptionIcon,
  VideoIcon,
} from "@/assets/icons/icon-pack-one";
import { AuthUser, useAuth } from "@/context/AuthContext";
import { deleteAccount, getProfile } from "@/lib/api/auth";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const profileOptions = [
  {
    id: "option-1",
    title: "My Videos",
    description: "View your watch history and saved videos",
    icon: VideoIcon,
  },
  {
    id: "option-2",
    title: "Subscriptions",
    description: "Manage channels you're subscribed to",
    icon: SubscriptionIcon,
  },
  {
    id: "option-3",
    title: "Settings",
    description: "Customize your app preferences and notifications",
    icon: SettingsIcon,
  },
  {
    id: "option-4",
    title: "Language",
    description: "Change your preferred language",
    icon: LanguageIcon,
  },
  {
    id: "option-5",
    title: "About",
    description: "Learn more about Arewaflix",
    icon: AboutIcon,
  },
  {
    id: "option-6",
    title: "Help & Support",
    description: "FAQs, contact details, and assistance",
    icon: HelpIcon,
  },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { token, user: authUser, signOut } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(authUser);
  const [loading, setLoading] = useState(!authUser);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [selectedDeleteOption, setSelectedDeleteOption] = useState<
    string | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = require("expo-router").useRouter();

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getProfile(token);
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!profile) {
      fetchProfile();
    }
  }, [profile, fetchProfile]);

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    // Open the modal to collect a compulsory reason
    setDeleteReason("");
    setSelectedDeleteOption(null);
    setDeleteError(null);
    setShowDeleteModal(true);
  }, []);

  const performDeleteAccount = useCallback(
    async (reason: string) => {
      if (!token) return;

      setDeleteError(null);
      setDeleting(true);

      try {
        const response = await deleteAccount(token, reason);
        if (response.success) {
          Alert.alert(
            "Account Deleted",
            "Your account has been permanently deleted.",
            [
              {
                text: "OK",
                onPress: async () => {
                  setShowDeleteModal(false);
                  await signOut();
                  router.replace("/");
                },
              },
            ]
          );
        } else {
          setDeleteError(
            response.message || "Failed to delete account. Please try again."
          );
          Alert.alert(
            "Error",
            response.message || "Failed to delete account. Please try again."
          );
        }
      } catch (error: any) {
        const message = error instanceof Error ? error.message : String(error);
        setDeleteError(message);
        Alert.alert(
          "Error",
          message || "Failed to delete account. Please try again."
        );
      } finally {
        setDeleting(false);
      }
    },
    [token, signOut, router]
  );

  const handleProfileOption = useCallback((optionId: string) => {
    switch (optionId) {
      case "option-5": // About
        Alert.alert(
          "About Arewaflix",
          `Version: ${Constants.expoConfig?.version || "1.0.0"}\n\nArewaflix brings you the best of Hausa entertainment.\n\nDeveloper: ${Constants.expoConfig?.owner || "Arewaflix Team"}`,
          [{ text: "OK" }]
        );
        break;
      case "option-6": // Help & Support
        WebBrowser.openBrowserAsync("https://arewaflix.com/contact-us");
        break;
      case "option-1": // My Videos
      case "option-2": // Subscriptions
      case "option-3": // Settings
      case "option-4": // Language
        Alert.alert(
          "Coming Soon",
          "This feature is under development and will be available soon.",
          [{ text: "OK" }]
        );
        break;
      default:
        break;
    }
  }, []);

  const bottomPadding = useMemo(
    () => Math.max(96, insets.bottom + 56),
    [insets.bottom]
  );

  if (loading) {
    return (
      <View className="items-center justify-center flex-1 bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center justify-center flex-1 p-4 bg-background dark:bg-background-dark">
        <Text className="text-lg text-destructive dark:text-destructive-dark">
          Error: {error}
        </Text>
        <Pressable
          onPress={fetchProfile}
          className="px-4 py-2 mt-4 rounded-md bg-primary text-primary-foreground dark:bg-primary-dark dark:text-primary-foreground-dark"
        >
          <Text>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // If user is not authenticated, show a friendly prompt with Login and Back buttons
  if (!token && !profile) {
    return (
      <View className="items-center justify-center flex-1 p-6 bg-background dark:bg-background-dark">
        <Text className="mb-4 text-lg font-semibold text-center text-white">
          You need to be logged in to view your profile.
        </Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.push("/auth/login")}
            className="px-4 py-3 rounded-md bg-primary"
          >
            <Text className="text-white">Login</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="px-4 py-3 rounded-md bg-surface-muted"
          >
            <Text>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View className="items-center justify-center p-6 pt-8">
        {/* Avatar: circular gradient with centered initial */}

        <LinearGradient
          colors={["#3b82f6", "#8b5cf6", "#06b6d4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            height: 128,
            width: 128,
            borderRadius: 64,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text className="font-bold text-white text-8xl">
            {(profile?.username || "U").charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>

        <Text className="mt-4 text-2xl font-bold text-center text-blue-500">
          {profile?.username}
        </Text>
        <Text className="text-center text-blue-400 text-md">
          {profile?.email}
        </Text>
      </View>

      <FlatList
        data={profileOptions}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: bottomPadding,
        }}
        renderItem={({ item }) => (
          <View className="w-1/2 p-2">
            <BlurView
              intensity={50}
              tint="dark"
              className="overflow-hidden rounded-lg"
            >
              <Pressable
                className="items-center justify-center p-4"
                onPress={() => handleProfileOption(item.id)}
              >
                <item.icon size={32} color="white" />
                <Text className="mt-2 font-semibold text-center text-white">
                  {item.title}
                </Text>
              </Pressable>
            </BlurView>
          </View>
        )}
      />

      {/* Delete Account Reason Modal (required) */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setShowDeleteModal(false);
        }}
      >
        {/* Overlay uses theme-aware overlay token so light/dark modes match the design */}
        <View className="items-center justify-center flex-1 p-4 bg-overlay dark:bg-overlay-dark">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="w-full max-w-md"
          >
            <BlurView
              intensity={80}
              tint="dark"
              className="overflow-hidden rounded-lg"
            >
              <View className="p-4 bg-surface">
                <Text className="mb-1 text-lg font-semibold text">
                  Why are you deleting your account?
                </Text>
                <Text className="mb-4 text-sm text-muted">
                  Please select a reason (required). This will be submitted to
                  help us improve.
                </Text>

                {/* Preset reasons */}
                <View className="mb-3">
                  {[
                    {
                      id: "no-longer-use",
                      label: "I no longer want to use this service.",
                    },
                    { id: "prefer-other", label: "I prefer another service." },
                    { id: "privacy", label: "Privacy concerns." },
                    { id: "notifications", label: "Too many notifications." },
                    { id: "other", label: "Other (please specify)" },
                  ].map((opt) => {
                    const selected = selectedDeleteOption === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => {
                          setSelectedDeleteOption(opt.id);
                          if (opt.id !== "other") setDeleteReason(opt.label);
                          else setDeleteReason("");
                        }}
                        className={`flex-row items-center justify-between px-4 py-3 rounded-lg mb-2 border ${
                          selected
                            ? "border-red-600 bg-red-600/10"
                            : "border-transparent bg-surface-muted"
                        }`}
                      >
                        <Text
                          className={`${selected ? "text-red-600 font-semibold" : "text"}`}
                        >
                          {opt.label}
                        </Text>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color="#dc2626"
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {/* If Other selected, show text input */}
                {selectedDeleteOption === "other" && (
                  <TextInput
                    value={deleteReason}
                    onChangeText={setDeleteReason}
                    placeholder="Please tell us why (required)"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    editable={!deleting}
                    className="bg-background p-3 rounded-md text min-h-[96px] mb-3"
                  />
                )}

                {deleteError ? (
                  <Text className="mb-2 text-sm text-destructive">
                    {deleteError}
                  </Text>
                ) : null}

                <View className="flex-row justify-end gap-3">
                  <Pressable
                    onPress={() => {
                      if (!deleting) {
                        setShowDeleteModal(false);
                        setDeleteReason("");
                        setSelectedDeleteOption(null);
                        setDeleteError(null);
                      }
                    }}
                    className="px-4 py-3 rounded-lg bg-surface-muted"
                  >
                    <Text className="text">Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (deleting) return;

                      if (!selectedDeleteOption) {
                        Alert.alert(
                          "Reason required",
                          "Please select a reason for deleting your account.",
                          [{ text: "OK" }]
                        );
                        return;
                      }

                      if (
                        selectedDeleteOption === "other" &&
                        (!deleteReason || !deleteReason.trim())
                      ) {
                        Alert.alert(
                          "Reason required",
                          "Please provide a reason for deleting your account.",
                          [{ text: "OK" }]
                        );
                        return;
                      }

                      Alert.alert(
                        "Final Confirmation",
                        "This will permanently delete your account and all associated data. Are you absolutely sure?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Confirm Delete",
                            style: "destructive",
                            onPress: () =>
                              performDeleteAccount(deleteReason.trim()),
                          },
                        ]
                      );
                    }}
                    className="px-4 py-3 bg-red-600 rounded-lg"
                  >
                    {deleting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-semibold text-white">Delete</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </BlurView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <View className="absolute bottom-0 left-0 right-0 gap-2 p-4">
        {/* Privacy & Terms Links */}
        <View className="flex-row items-center justify-center gap-4 mb-2">
          <Pressable
            onPress={() =>
              WebBrowser.openBrowserAsync(
                "https://arewaflix.com/terms/privacy-policy"
              )
            }
          >
            <Text className="text-sm text-blue-400 underline">
              Privacy Policy
            </Text>
          </Pressable>
          <Text className="text-sm text-gray-500">•</Text>
          <Pressable
            onPress={() =>
              WebBrowser.openBrowserAsync("https://arewaflix.com/terms/terms")
            }
          >
            <Text className="text-sm text-blue-400 underline">
              Terms of Service
            </Text>
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          className="px-4 py-3 rounded-md"
          android_ripple={{ color: "rgba(255,255,255,0.1)" }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text className="font-bold text-center text-white">Sign Out</Text>
        </Pressable>

        {/* Delete Account Button */}
        <Pressable
          onPress={handleDeleteAccount}
          className="px-4 py-3 mb-2 border rounded-md bg-red-600/20 border-red-600/40"
          android_ripple={{ color: "rgba(220,38,38,0.2)" }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
            <Text className="font-semibold text-center text-red-600">
              Delete Account
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}
