import { AboutIcon, HelpIcon } from "@/assets/icons/icon-pack-one";
import { AuthUser, useAuth } from "@/context/AuthContext";
import { deleteAccount, getProfile, updateProfile } from "@/lib/api/auth";
import { Ionicons } from "@expo/vector-icons";
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
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const profileOptions = [
  /*
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
  */
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
  {
    id: "option-7",
    title: "Privacy Policy",
    description: "View our privacy policy",
    icon: AboutIcon,
  },
  {
    id: "option-8",
    title: "Terms of Service",
    description: "Read our terms of use",
    icon: AboutIcon,
  },
  {
    id: "option-9",
    title: "Sign Out",
    description: "Sign out of your account",
    // use Ionicons as a component for the icon
    icon: (props: any) => <Ionicons name="log-out-outline" {...props} />,
  },
  {
    id: "option-10",
    title: "Delete Account",
    description: "Permanently delete your account",
    icon: (props: any) => <Ionicons name="trash-outline" {...props} />,
  },
];

// Major world languages (code, English name, native name)
const LANGUAGES: Array<{ code: string; english: string; native: string }> = [
  { code: "en", english: "English", native: "English" },
  { code: "es", english: "Spanish", native: "Español" },
  { code: "fr", english: "French", native: "Français" },
  { code: "ar", english: "Arabic", native: "العربية" },
  { code: "hi", english: "Hindi", native: "हिन्दी" },
  { code: "zh", english: "Chinese", native: "中文" },
  { code: "ja", english: "Japanese", native: "日本語" },
  { code: "ko", english: "Korean", native: "한국어" },
  { code: "pt", english: "Portuguese", native: "Português" },
  { code: "ru", english: "Russian", native: "Русский" },
  { code: "de", english: "German", native: "Deutsch" },
];

function getLanguageLabel(code: string) {
  const found = LANGUAGES.find((l) => l.code === code);
  if (!found) return code || "Unknown";
  return `${found.english} (${found.native})`;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { token, user: authUser, signOut } = useAuth();
  const { signIn } = useAuth();
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
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const [formUsername, setFormUsername] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formFirstName, setFormFirstName] = useState<string>("");
  const [formLastName, setFormLastName] = useState<string>("");
  const [formLanguage, setFormLanguage] = useState<string>("");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
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

  useEffect(() => {
    if (profile) {
      setFormUsername(profile.username || "");
      setFormEmail(profile.email || "");
      setFormFirstName(profile.first_name || "");
      setFormLastName(profile.last_name || "");
      // prefer language code if available, otherwise use raw value
      setFormLanguage(profile.language || "");
    }
  }, [profile]);

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

  const handleProfileOption = useCallback(
    (optionId: string) => {
      try {
        switch (optionId) {
          case "option-5": // About
            Alert.alert(
              "About Arewaflix",
              `Version: ${Constants.expoConfig?.version || "1.0.0"}\n\nArewaflix brings you the best of Hausa entertainment.\n\nDeveloper: Vehance IT\n\n© ${new Date().getFullYear()} Arewaflix. All rights reserved.`,
              [{ text: "OK" }]
            );
            break;
          case "option-6": // Help & Support
            WebBrowser.openBrowserAsync(
              "https://arewaflix.com/contact-us"
            ).catch(console.error);
            break;
          case "option-7": // Privacy Policy
            WebBrowser.openBrowserAsync(
              "https://arewaflix.com/terms/privacy-policy"
            ).catch(console.error);
            break;
          case "option-8": // Terms of Service
            WebBrowser.openBrowserAsync(
              "https://arewaflix.com/terms/terms"
            ).catch(console.error);
            break;
          case "option-9": // Sign Out
            handleSignOut();
            break;
          case "option-10": // Delete Account
            handleDeleteAccount();
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
      } catch (error) {
        console.error("Error handling profile option:", error);
      }
    },
    [handleSignOut, handleDeleteAccount]
  );

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

        <Pressable
          onPress={() => setShowProfileModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Open profile details"
        >
          <Text className="mt-4 text-2xl font-bold text-center text-blue-500">
            {profile?.username}
          </Text>
          <Text className="text-center text-blue-400 text-md">
            {profile?.email}
          </Text>
        </Pressable>
        {/* Visible View Profile button for discoverability */}
        <Pressable
          onPress={() => setShowProfileModal(true)}
          accessibilityRole="button"
          accessibilityLabel="View profile details"
          className="px-4 py-2 mt-3 rounded-md bg-primary"
          android_ripple={{ color: "rgba(255,255,255,0.08)" }}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <Text className="font-semibold text-center text-white">
            View Profile
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/see-all/saved")}
          accessibilityRole="button"
          accessibilityLabel="Saved videos"
          className="px-4 py-2 mt-3 bg-transparent border border-blue-500 rounded-md"
          android_ripple={{ color: "rgba(59,130,246,0.08)" }}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="bookmark-outline" size={16} color="#3b82f6" />
            <Text className="ml-2 font-semibold text-center text-blue-500">
              Saved Videos
            </Text>
          </View>
        </Pressable>
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
            <Pressable
              className="items-center justify-center p-4 overflow-hidden border rounded-lg bg-zinc-800/50 border-zinc-700/30"
              onPress={() => handleProfileOption(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityHint={item.description}
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <item.icon size={32} color="white" />
              <Text className="mt-2 font-semibold text-center text-white">
                {item.title}
              </Text>
            </Pressable>
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
        <View
          className="items-center justify-center flex-1 p-4 bg-black/80"
          pointerEvents="box-none"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            className="w-full max-w-md"
          >
            <View
              className="overflow-hidden shadow-2xl rounded-2xl bg-zinc-900/95"
              pointerEvents="auto"
            >
              {/* Header */}
              <View className="items-center pt-6 pb-4">
                <View className="items-center justify-center w-20 h-20 mb-3 rounded-full bg-red-600/20">
                  <Ionicons name="warning" size={40} color="#dc2626" />
                </View>

                <Pressable
                  onPress={() => {
                    if (!deleting) {
                      setShowDeleteModal(false);
                      setDeleteReason("");
                      setSelectedDeleteOption(null);
                      setDeleteError(null);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Close delete account modal"
                  className="absolute p-2 rounded-full top-4 right-4 bg-white/10"
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </Pressable>
              </View>

              {/* Subtle separator */}
              <View className="h-px mx-6 bg-white/10" />

              {/* Content */}
              <View className="px-6 py-6">
                <Text className="mb-2 text-lg font-semibold text-center text-white">
                  Delete Account
                </Text>
                <Text className="mb-6 text-sm text-center text-gray-400">
                  Why are you deleting your account? Please select a reason
                  (required). This will be submitted to help us improve.
                </Text>

                {/* Preset reasons */}
                <View className="mb-6 space-y-2 ">
                  {[
                    {
                      id: "no-longer-use",
                      label: "I no longer want to use this service.",
                    },
                    {
                      id: "prefer-other",
                      label: "I prefer another service.",
                    },
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
                        className={`flex-row items-center justify-between px-4 py-3 my-2 rounded-xl border ${
                          selected
                            ? "border-red-600 bg-red-600/10"
                            : "border-zinc-700/50 bg-zinc-800/50"
                        }`}
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                      >
                        <Text
                          className={`text-base ${selected ? "text-red-400 font-semibold" : "text-white"}`}
                        >
                          {opt.label}
                        </Text>
                        {selected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#dc2626"
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {/* If Other selected, show text input */}
                {selectedDeleteOption === "other" && (
                  <View className="mb-6">
                    <TextInput
                      value={deleteReason}
                      onChangeText={setDeleteReason}
                      placeholder="Please tell us why (required)"
                      placeholderTextColor="#6B7280"
                      multiline
                      numberOfLines={4}
                      editable={!deleting}
                      className="px-4 py-3 text-base text-white border rounded-xl bg-zinc-800/50 border-zinc-700/50 min-h-[96px]"
                    />
                  </View>
                )}

                {deleteError ? (
                  <View className="px-4 py-3 mb-4 border rounded-lg bg-red-500/10 border-red-500/20">
                    <View className="flex-row items-center">
                      <Ionicons name="alert-circle" size={18} color="#ef4444" />
                      <Text className="flex-1 ml-2 text-sm text-red-400">
                        {deleteError}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View className="pt-2">
                  <View className="h-px mb-4 bg-white/10" />

                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => {
                        if (!deleting) {
                          setShowDeleteModal(false);
                          setDeleteReason("");
                          setSelectedDeleteOption(null);
                          setDeleteError(null);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel account deletion"
                      className="flex-1 px-4 py-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Text className="text-base font-semibold text-center text-white">
                        Cancel
                      </Text>
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
                      accessibilityRole="button"
                      accessibilityLabel="Confirm account deletion"
                      className="flex-1 px-4 py-3.5 rounded-xl bg-red-600"
                      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                    >
                      {deleting ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="trash" size={18} color="#fff" />
                          <Text className="ml-2 text-base font-semibold text-white">
                            Delete Account
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Profile Details / Edit Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!updateLoading) {
            setShowProfileModal(false);
            setIsEditing(false);
            setShowLanguagePicker(false);
            setUpdateError(null);
          }
        }}
      >
        <View
          className="items-center justify-center flex-1 p-4 bg-black/80"
          pointerEvents="box-none"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
            className="w-full max-w-md"
          >
            <View
              className="overflow-hidden shadow-2xl rounded-2xl bg-zinc-900/95"
              pointerEvents="auto"
            >
              {/* Header with Avatar */}
              <View className="items-center pt-6 pb-4">
                <LinearGradient
                  colors={["#3b82f6", "#8b5cf6", "#06b6d4"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: 80,
                    width: 80,
                    borderRadius: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text className="text-5xl font-bold text-white">
                    {(profile?.username || "U").charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>

                <Pressable
                  onPress={() => {
                    if (!updateLoading) {
                      setShowProfileModal(false);
                      setIsEditing(false);
                      setShowLanguagePicker(false);
                      setUpdateError(null);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Close profile modal"
                  className="absolute p-2 rounded-full top-4 right-4 bg-white/10"
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </Pressable>
              </View>

              {/* Subtle separator */}
              <View className="h-px mx-6 bg-white/10" />

              {/* Fields */}
              <View className="px-6 py-6 space-y-8">
                {/* Username Field */}
                <View>
                  <View className="flex-row items-center my-3">
                    <Ionicons name="person-outline" size={16} color="#9CA3AF" />
                    <Text className="ml-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
                      Username
                    </Text>
                  </View>
                  {isEditing ? (
                    <View className="flex-row items-center px-4 py-3 border rounded-xl bg-zinc-800/50 border-zinc-700/50">
                      <TextInput
                        value={formUsername}
                        onChangeText={setFormUsername}
                        editable={!updateLoading}
                        accessibilityLabel="Username input"
                        className="flex-1 text-base text-white"
                        placeholderTextColor="#6B7280"
                      />
                      <Ionicons
                        name="create-outline"
                        size={18}
                        color="#6366f1"
                      />
                    </View>
                  ) : (
                    <Text className="px-4 py-3 text-base text-white rounded-xl bg-zinc-800/30">
                      {profile?.username}
                    </Text>
                  )}
                </View>

                {/* Email Field - Read Only */}
                <View>
                  <View className="flex-row items-center my-3">
                    <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
                    <Text className="ml-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
                      Email
                    </Text>
                    <View className="flex-row items-center px-2 py-1 ml-auto rounded-full bg-zinc-800/50">
                      <Ionicons name="lock-closed" size={10} color="#6B7280" />
                      <Text className="ml-1 text-xs text-gray-500">
                        Read only
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="px-4 py-3 text-base rounded-xl bg-zinc-800/30 text-zinc-400"
                    accessibilityLabel="Email"
                  >
                    {formEmail || profile?.email}
                  </Text>
                </View>

                {/* First Name & Last Name Row */}
                <View className="flex-row gap-3 my-3">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-3">
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#9CA3AF"
                      />
                      <Text className="ml-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
                        First Name
                      </Text>
                    </View>
                    <View className="flex-row items-center px-3 py-3 rounded-xl bg-zinc-800/30">
                      <Text
                        className="flex-1 text-base text-zinc-400"
                        accessibilityLabel="First name"
                      >
                        {formFirstName || profile?.first_name || "—"}
                      </Text>
                      <Ionicons name="lock-closed" size={12} color="#52525b" />
                    </View>
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center mb-3">
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="#9CA3AF"
                      />
                      <Text className="ml-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
                        Last Name
                      </Text>
                    </View>
                    <View className="flex-row items-center px-3 py-3 rounded-xl bg-zinc-800/30">
                      <Text
                        className="flex-1 text-base text-zinc-400"
                        accessibilityLabel="Last name"
                      >
                        {formLastName || profile?.last_name || "—"}
                      </Text>
                      <Ionicons name="lock-closed" size={12} color="#52525b" />
                    </View>
                  </View>
                </View>

                {/* Language Field */}
                <View>
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="globe-outline" size={16} color="#9CA3AF" />
                    <Text className="ml-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
                      Language
                    </Text>
                  </View>
                  {isEditing ? (
                    <View>
                      <Pressable
                        onPress={() => setShowLanguagePicker((s) => !s)}
                        accessibilityRole="button"
                        accessibilityLabel="Select language"
                        className="flex-row items-center justify-between px-4 py-3 border rounded-xl bg-zinc-800/50 border-zinc-700/50"
                        style={({ pressed }) => [
                          { opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Text className="text-base text-white">
                          {formLanguage
                            ? getLanguageLabel(formLanguage)
                            : "Select language"}
                        </Text>
                        <Ionicons
                          name={
                            showLanguagePicker ? "chevron-up" : "chevron-down"
                          }
                          size={18}
                          color="#6366f1"
                        />
                      </Pressable>

                      {showLanguagePicker && (
                        <View className="mt-3 overflow-hidden border rounded-xl border-zinc-700/50 bg-zinc-800/80">
                          <View className="px-4 py-2 border-b border-zinc-700/50">
                            <View className="flex-row items-center px-3 py-2 rounded-lg bg-zinc-900/50">
                              <Ionicons
                                name="search"
                                size={16}
                                color="#6B7280"
                              />
                              <TextInput
                                value={languageSearch}
                                onChangeText={setLanguageSearch}
                                placeholder="Search languages..."
                                placeholderTextColor="#6B7280"
                                className="flex-1 ml-2 text-sm text-white"
                                accessibilityLabel="Search languages"
                              />
                            </View>
                          </View>

                          <ScrollView
                            style={{ maxHeight: 200 }}
                            contentContainerStyle={{ paddingBottom: 4 }}
                          >
                            {LANGUAGES.filter((l) => {
                              const q = languageSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                l.english.toLowerCase().includes(q) ||
                                l.native.toLowerCase().includes(q) ||
                                l.code.toLowerCase().includes(q)
                              );
                            }).map((l) => {
                              const selected = l.code === formLanguage;
                              return (
                                <Pressable
                                  key={l.code}
                                  onPress={() => {
                                    setFormLanguage(l.code);
                                    setShowLanguagePicker(false);
                                    setLanguageSearch("");
                                  }}
                                  className={`px-4 py-3 border-b border-zinc-700/30 ${selected ? "bg-indigo-600/20" : ""}`}
                                  style={({ pressed }) => [
                                    {
                                      backgroundColor: pressed
                                        ? "rgba(99, 102, 241, 0.1)"
                                        : selected
                                          ? "rgba(99, 102, 241, 0.2)"
                                          : "transparent",
                                    },
                                  ]}
                                >
                                  <View className="flex-row items-center justify-between">
                                    <Text
                                      className={`text-base ${selected ? "text-indigo-400 font-semibold" : "text-white"}`}
                                    >
                                      {l.english} ({l.native})
                                    </Text>
                                    {selected && (
                                      <Ionicons
                                        name="checkmark-circle"
                                        size={18}
                                        color="#818cf8"
                                      />
                                    )}
                                  </View>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text className="px-4 py-3 text-base text-white rounded-xl bg-zinc-800/30">
                      {profile?.language
                        ? getLanguageLabel(profile.language)
                        : "—"}
                    </Text>
                  )}
                </View>
              </View>

              {updateError ? (
                <View className="px-6 pb-2">
                  <View className="flex-row items-center px-4 py-3 border rounded-lg bg-red-500/10 border-red-500/20">
                    <Ionicons name="alert-circle" size={18} color="#ef4444" />
                    <Text className="flex-1 ml-2 text-sm text-red-400">
                      {updateError}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View className="px-6 pt-2 pb-6">
                <View className="h-px mb-4 bg-white/10" />

                {isEditing ? (
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => {
                        if (updateLoading) return;
                        // Cancel edits, reset fields to current profile
                        setFormUsername(profile?.username || "");
                        setFormEmail(profile?.email || "");
                        setFormFirstName(profile?.first_name || "");
                        setFormLastName(profile?.last_name || "");
                        setFormLanguage(profile?.language || "");
                        setShowLanguagePicker(false);
                        setIsEditing(false);
                        setUpdateError(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel editing profile"
                      accessibilityState={{ disabled: updateLoading }}
                      className="flex-1 px-4 py-3.5 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Text className="text-base font-semibold text-center text-white">
                        Cancel
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={async () => {
                        if (!token) {
                          Alert.alert("Not authenticated");
                          return;
                        }

                        setUpdateError(null);
                        setUpdateLoading(true);

                        try {
                          const payload: any = {};
                          // Only allow username and language to be updated
                          if (formUsername !== profile?.username)
                            payload.username = formUsername;
                          if (formLanguage !== profile?.language)
                            payload.language = formLanguage;

                          // If nothing changed, short-circuit
                          if (!Object.keys(payload).length) {
                            setIsEditing(false);
                            setShowLanguagePicker(false);
                            setUpdateLoading(false);
                            return;
                          }

                          const res = await updateProfile(token, payload);
                          if (res.success && res.data) {
                            setProfile(res.data);
                            try {
                              // Persist updated user to auth context storage
                              await signIn(res.data, token);
                            } catch (e) {
                              // ignore signIn persistence errors
                            }
                            setIsEditing(false);
                            setShowLanguagePicker(false);
                            Alert.alert(
                              "Profile Updated",
                              "Your profile has been updated."
                            );
                          } else {
                            setUpdateError(
                              res.message || "Failed to update profile"
                            );
                            Alert.alert(
                              "Error",
                              res.message || "Failed to update profile"
                            );
                          }
                        } catch (err: any) {
                          const message =
                            err instanceof Error ? err.message : String(err);
                          setUpdateError(message);
                          Alert.alert(
                            "Error",
                            message || "Failed to update profile"
                          );
                        } finally {
                          setUpdateLoading(false);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Save profile changes"
                      accessibilityState={{ disabled: updateLoading }}
                      className="flex-1 px-4 py-3.5 rounded-xl bg-primary"
                      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                    >
                      {updateLoading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="checkmark" size={18} color="#fff" />
                          <Text className="ml-2 text-base font-semibold text-white">
                            Save Changes
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setIsEditing(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit profile"
                    className="w-full px-4 py-3.5 rounded-xl bg-primary"
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="create-outline" size={18} color="#fff" />
                      <Text className="ml-2 text-base font-semibold text-white">
                        Edit Profile
                      </Text>
                    </View>
                  </Pressable>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
