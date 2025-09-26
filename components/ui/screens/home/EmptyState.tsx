import React from "react";
import { Text, View } from "react-native";

export type EmptyStateProps = {
  message: string;
};

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <View className="mt-6 rounded-2xl border border-border/60 bg-surface-muted/40 px-4 py-10 dark:border-border-dark/60 dark:bg-surface-muted-dark/40">
      <Text className="text-center text-sm text-muted dark:text-muted-dark">
        {message}
      </Text>
    </View>
  );
}
