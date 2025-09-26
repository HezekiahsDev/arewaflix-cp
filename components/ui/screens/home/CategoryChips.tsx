import React from "react";
import { Pressable, ScrollView, Text } from "react-native";

export type CategoryChipsProps = {
  items: string[];
};

export function CategoryChips({ items }: CategoryChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 16 }}
    >
      {items.map((item, index) => (
        <Pressable
          key={item}
          className={`rounded-full px-5 py-2 ${index === 0 ? "bg-primary dark:bg-primary-dark" : "bg-surface-muted dark:bg-surface-muted-dark"}`}
          style={{ marginRight: index === items.length - 1 ? 0 : 12 }}
        >
          <Text
            className={`text-sm font-semibold ${index === 0 ? "text-primary-foreground dark:text-primary-foreground-dark" : "text-muted dark:text-muted-dark"}`}
          >
            {item}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
