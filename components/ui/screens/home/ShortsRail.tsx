import { Video } from "@/lib/api/videos";
// duration label removed from short rail cards
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Image, Pressable } from "react-native";

export type ShortsRailProps = {
  items: Video[];
};

export function ShortsRail({ items }: ShortsRailProps) {
  const router = useRouter();

  const handlePress = (video: any) => {
    try {
      // Navigate to the shorts screen with the specific video ID
      router.push({
        pathname: "/(tabs)/shorts",
        params: {
          videoId: video.id,
        },
      });
    } catch (err) {
      console.error("Failed to handle short press:", err);
    }
  };

  return (
    <FlatList
      data={items}
      horizontal
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 12 }}
      renderItem={({ item, index }) => {
        return (
          <Pressable
            onPress={() => handlePress(item)}
            className="w-32 h-48 overflow-hidden border rounded-2xl border-border dark:border-border-dark bg-surface-muted dark:bg-surface-muted-dark"
            style={{ marginRight: index === items.length - 1 ? 0 : 12 }}
          >
            <Image source={{ uri: item.imageUrl }} className="w-full h-full" />
          </Pressable>
        );
      }}
    />
  );
}
