import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";

const quickLinks = [
  {
    id: "link-1",
    title: "Login",
    description: "Access your library, history, and subscriptions",
  },
  {
    id: "link-2",
    title: "Register",
    description: "Create a free account to join the community",
  },
  {
    id: "link-3",
    title: "Articles",
    description: "Editorials, interviews, and release notes",
  },
  {
    id: "link-4",
    title: "Popular Channels",
    description: "Creators everyone is watching right now",
  },
  {
    id: "link-5",
    title: "Latest Videos",
    description: "Fresh uploads across every category",
  },
  {
    id: "link-6",
    title: "Support",
    description: "FAQs, contact details, and language options",
  },
];

export default function MoreScreen() {
  return (
    <View className="flex-1 bg-background px-4 pt-12 dark:bg-background-dark">
      <Text className="text-3xl font-semibold text-text dark:text-text-dark">
        Account & More
      </Text>
      <Text className="mt-2 text-base text-muted dark:text-muted-dark">
        Quick shortcuts to the rest of the Arewaflix experience.
      </Text>
      <FlatList
        data={quickLinks}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: 96 }}
        renderItem={({ item, index }) => (
          <Pressable
            className="rounded-3xl border border-border bg-card p-5 shadow-sm dark:border-border-dark dark:bg-card-dark"
            style={{ marginBottom: index === quickLinks.length - 1 ? 0 : 16 }}
          >
            <Text className="text-xl font-semibold text-text dark:text-text-dark">
              {item.title}
            </Text>
            <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
              {item.description}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
