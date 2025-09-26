import { Video } from "@/lib/api/videos";
import { getDurationLabel } from "@/lib/videos/formatters";
import React from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";

export type ShortsRailProps = {
  items: Video[];
};

export function ShortsRail({ items }: ShortsRailProps) {
  return (
    <FlatList
      data={items}
      horizontal
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 12 }}
      renderItem={({ item, index }) => {
        const durationLabel = getDurationLabel(item);
        return (
          <Pressable
            className="h-48 w-32 overflow-hidden rounded-2xl border border-border dark:border-border-dark bg-surface-muted dark:bg-surface-muted-dark"
            style={{ marginRight: index === items.length - 1 ? 0 : 12 }}
          >
            <Image source={{ uri: item.imageUrl }} className="h-full w-full" />
            {durationLabel ? (
              <View className="absolute inset-x-2 bottom-2 rounded-full bg-black/60 px-2 py-1">
                <Text className="text-center text-xs font-semibold text-white">
                  {durationLabel}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}
