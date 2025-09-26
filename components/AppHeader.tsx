import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";

import Colors, { ThemeName } from "@/constants/Colors";
import { AuthUser, useAuth } from "@/context/AuthContext";

type AppHeaderProps = {
  colorScheme: ThemeName;
};

const LOGO_LIGHT = require("../assets/images/af-logo-dark.png");
const LOGO_DARK = require("../assets/images/af-logo-light.png");

export default function AppHeader({ colorScheme }: AppHeaderProps) {
  const { isAuthenticated, user } = useAuth();

  const palette = Colors[colorScheme];
  const logoSource = colorScheme === "dark" ? LOGO_DARK : LOGO_LIGHT;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const handleLoginPress = useCallback(() => {
    // TODO: Replace with real authentication flow.
    console.log("Login button pressed");
  }, []);

  const handleProfilePress = useCallback(() => {
    // TODO: Navigate to the user profile or account page when available.
    console.log("Profile button pressed");
  }, []);

  const handleSearchPress = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleCancelSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }, []);

  const handleSearchSubmit = useCallback(() => {
    console.log("Search submitted:", searchQuery.trim());
  }, [searchQuery]);

  const trailingAction = useMemo(() => {
    if (!isAuthenticated) {
      return (
        <Pressable
          accessibilityRole="button"
          onPress={handleLoginPress}
          className="rounded-full border border-primary px-4 py-2 dark:border-primary-dark"
        >
          <Text className="text-sm font-semibold uppercase tracking-wide text-primary dark:text-primary-dark">
            Login
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        accessibilityRole="button"
        onPress={handleProfilePress}
        className="overflow-hidden rounded-full border border-border dark:border-border-dark"
        style={{ width: 36, height: 36 }}
      >
        <AvatarFallback user={user} color={palette.text} />
      </Pressable>
    );
  }, [
    handleLoginPress,
    handleProfilePress,
    isAuthenticated,
    palette.text,
    user,
  ]);

  return (
    <View className="border-b border-border bg-background px-4 py-2 dark:border-border-dark dark:bg-background-dark ">
      {isSearchOpen ? (
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center rounded-full bg-surface-muted px-3 py-2 dark:bg-surface-muted-dark">
            <Feather name="search" size={18} color={palette.textMuted} />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search Arewaflix"
              placeholderTextColor={palette.textMuted}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              style={{
                flex: 1,
                color: palette.text,
                fontSize: 16,
                marginLeft: 8,
                paddingVertical: 0,
              }}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search query"
                onPress={handleClearSearch}
                hitSlop={8}
                className="ml-2 rounded-full p-1"
              >
                <Feather name="x" size={16} color={palette.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={handleCancelSearch}
            className="px-1 py-1"
          >
            <Text className="text-sm font-semibold text-primary dark:text-primary-dark">
              Cancel
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Image
              source={logoSource}
              style={{ height: 38, width: 120, resizeMode: "contain" }}
              accessibilityRole="image"
              accessibilityLabel="Arewaflix"
            />
          </View>

          <View className="flex-row items-center gap-3">
            <HeaderIconButton
              icon="search"
              iconColor={palette.text}
              accessibilityLabel="Search videos"
              onPress={handleSearchPress}
            />
            {isAuthenticated ? (
              <HeaderIconButton
                icon="bell"
                iconColor={palette.text}
                accessibilityLabel="View notifications"
              />
            ) : null}
            {trailingAction}
          </View>
        </View>
      )}
    </View>
  );
}

type HeaderIconButtonProps = {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconColor: string;
  accessibilityLabel: string;
  onPress?: () => void;
};

function HeaderIconButton({
  icon,
  iconColor,
  accessibilityLabel,
  onPress,
}: HeaderIconButtonProps) {
  return (
    <Pressable
      className="rounded-full bg-surface-muted p-2 dark:bg-surface-muted-dark"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
    >
      <Feather name={icon} size={20} color={iconColor} />
    </Pressable>
  );
}

type AvatarFallbackProps = {
  user: AuthUser | null;
  color: string;
};

function AvatarFallback({ user, color }: AvatarFallbackProps) {
  if (user?.avatarUrl) {
    return (
      <Image
        source={{ uri: user.avatarUrl }}
        style={{ width: "100%", height: "100%" }}
        accessibilityRole="image"
        accessibilityLabel={user.name}
      />
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-surface-muted dark:bg-surface-muted-dark">
      <FontAwesome name="user" size={18} color={color} />
    </View>
  );
}
