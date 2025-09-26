import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";

const categories = [
  {
    id: "cat-0",
    name: "All",
    description: "Every video highlighted in one feed",
  },
  {
    id: "cat-1",
    name: "Film & Animation",
    description: "Series, movies, and cinematic shorts",
  },
  {
    id: "cat-2",
    name: "Music",
    description: "Latest Hausa hits and live sessions",
  },
  {
    id: "cat-3",
    name: "Sports",
    description: "Football highlights and athlete stories",
  },
  {
    id: "cat-4",
    name: "Travel & Events",
    description: "Explore Northern Nigeria with the crew",
  },
  {
    id: "cat-5",
    name: "Gaming",
    description: "Playthroughs and competitive matches",
  },
  {
    id: "cat-6",
    name: "People & Blogs",
    description: "Everyday stories from the community",
  },
  {
    id: "cat-7",
    name: "Comedy",
    description: "Sketches, stand-up, and viral laughs",
  },
];

export default function CategoriesScreen() {
  return (
    <View className="flex-1 bg-background px-4 pt-12 dark:bg-background-dark">
      <Text className="text-3xl font-semibold text-text dark:text-text-dark">
        Categories
      </Text>
      <Text className="mt-2 text-base text-muted dark:text-muted-dark">
        Jump into a genre to discover more videos.
      </Text>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingVertical: 24, paddingBottom: 96 }}
        renderItem={({ item }) => (
          <Pressable
            className="rounded-3xl border border-border bg-card p-5 shadow-sm dark:border-border-dark dark:bg-card-dark"
            style={{ marginBottom: 16, width: "48%" }}
          >
            <Text className="text-lg font-semibold text-text dark:text-text-dark">
              {item.name}
            </Text>
            <Text className="mt-2 text-sm text-muted dark:text-muted-dark">
              {item.description}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}
