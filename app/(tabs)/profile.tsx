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
  Pressable,
  Text,
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
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.\n\nAll your data including:\n• Profile information\n• Watch history\n• Saved videos\n• Comments\n\nwill be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Second confirmation
            Alert.alert(
              "Final Confirmation",
              "This will permanently delete your account and all associated data. Are you absolutely sure?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Confirm Delete",
                  style: "destructive",
                  onPress: async () => {
                    if (!token) return;

                    try {
                      const response = await deleteAccount(token);
                      if (response.success) {
                        Alert.alert(
                          "Account Deleted",
                          "Your account has been permanently deleted.",
                          [
                            {
                              text: "OK",
                              onPress: async () => {
                                await signOut();
                                router.replace("/");
                              },
                            },
                          ]
                        );
                      } else {
                        Alert.alert(
                          "Error",
                          response.message ||
                            "Failed to delete account. Please try again."
                        );
                      }
                    } catch (error) {
                      Alert.alert(
                        "Error",
                        error instanceof Error
                          ? error.message
                          : "Failed to delete account. Please try again."
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [token, signOut, router]);

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
        WebBrowser.openBrowserAsync("https://arewaflix.com/support");
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
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-4 dark:bg-background-dark">
        <Text className="text-lg text-destructive dark:text-destructive-dark">
          Error: {error}
        </Text>
        <Pressable
          onPress={fetchProfile}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground dark:bg-primary-dark dark:text-primary-foreground-dark"
        >
          <Text>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // If user is not authenticated, show a friendly prompt with Login and Back buttons
  if (!token && !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6 dark:bg-background-dark">
        <Text className="mb-4 text-center text-lg font-semibold text-white">
          You need to be logged in to view your profile.
        </Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.push("/auth/login")}
            className="rounded-md bg-primary px-4 py-3"
          >
            <Text className="text-white">Login</Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="rounded-md bg-surface-muted px-4 py-3"
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
          <Text className="text-8xl font-bold text-white">
            {(profile?.username || "U").charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>

        <Text className="mt-4 text-2xl font-bold text-blue-500 text-center">
          {profile?.username}
        </Text>
        <Text className="text-md text-blue-400 text-center">
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
                <Text className="mt-2 text-center font-semibold text-white">
                  {item.title}
                </Text>
              </Pressable>
            </BlurView>
          </View>
        )}
      />

      <View className="absolute bottom-0 left-0 right-0 p-4 gap-2">
        {/* Privacy & Terms Links */}
        <View className="flex-row items-center justify-center gap-4 mb-2">
          <Pressable
            onPress={() =>
              WebBrowser.openBrowserAsync("https://arewaflix.io/privacy")
            }
          >
            <Text className="text-sm text-blue-400 underline">
              Privacy Policy
            </Text>
          </Pressable>
          <Text className="text-sm text-gray-500">•</Text>
          <Pressable
            onPress={() =>
              WebBrowser.openBrowserAsync("https://arewaflix.io/terms")
            }
          >
            <Text className="text-sm text-blue-400 underline">
              Terms of Service
            </Text>
          </Pressable>
        </View>

        {/* Delete Account Button */}
        <Pressable
          onPress={handleDeleteAccount}
          className="rounded-md bg-red-600/20 border border-red-600/40 px-4 py-3 mb-2"
          android_ripple={{ color: "rgba(220,38,38,0.2)" }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons name="trash-outline" size={18} color="#dc2626" />
            <Text className="text-center font-semibold text-red-600">
              Delete Account
            </Text>
          </View>
        </Pressable>

        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          className="rounded-md px-4 py-3"
          android_ripple={{ color: "rgba(255,255,255,0.1)" }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Text className="text-center font-bold text-white">Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}
