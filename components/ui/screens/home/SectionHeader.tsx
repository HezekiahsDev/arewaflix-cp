import React from "react";
import { Pressable, Text, View } from "react-native";

export type SectionHeaderProps = {
  title: string;
  ctaLabel?: string;
  onPress?: () => void;
};

export function SectionHeader({
  title,
  ctaLabel,
  onPress,
}: SectionHeaderProps) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <Text className="text-2xl font-semibold text-text dark:text-text-dark">
        {title}
      </Text>
      {ctaLabel ? (
        <Pressable onPress={onPress} className="px-2 py-1">
          <Text className="text-sm font-semibold text-primary dark:text-primary-dark">
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
