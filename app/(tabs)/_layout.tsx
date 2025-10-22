import { NavIcon, NavIconName } from "@/assets/icons/navIcons";
import { useAuth } from "@/context/AuthContext";
import { FontAwesome } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React from "react";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

type IconProps = {
  color: string;
  focused: boolean;
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuth();

  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? "light"].tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].backgroundElevated,
          borderTopColor: Colors[colorScheme ?? "light"].border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <NavIcon
              name={"home" as NavIconName}
              size={24}
              strokeColor={color}
              accentColor={color}
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: "Shorts",
          tabBarIcon: ({ color, focused }) => (
            <NavIcon
              name={"shorts" as NavIconName}
              size={26}
              strokeColor={color}
              accentColor={color}
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trending"
        options={{
          title: "Trending",
          tabBarIcon: ({ color, focused }) => (
            <NavIcon
              name={"explore" as NavIconName}
              size={24}
              strokeColor={color}
              accentColor={color}
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <NavIcon
              name={"search" as NavIconName}
              size={24}
              strokeColor={color}
              accentColor={color}
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="user"
              size={24}
              color={color}
              style={{ opacity: focused ? 1 : 0.7 }}
            />
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            // If unauthenticated, prevent default navigation and send to login
            if (!isAuthenticated) {
              e.preventDefault();
              router.push("/auth/login");
            }
          },
        })}
      />
    </Tabs>
  );
}
