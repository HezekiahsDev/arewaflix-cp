import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Video, fetchShorts, getVideosErrorMessage } from "@/lib/api/videos";
import { getDurationLabel } from "@/lib/videos/formatters";

export default function ShortsScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = useMemo(
    () => Math.max(96, insets.bottom + 56),
    [insets.bottom]
  );
  const [shorts, setShorts] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShorts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchShorts({ limit: 30, sort: "latest" });
      setShorts(data);
      setError(null);
    } catch (error) {
      console.error("[ShortsScreen] Failed to load shorts", error);
      setError(getVideosErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadShorts(false);
  }, [loadShorts]);

  const onRefresh = useCallback(() => loadShorts(true), [loadShorts]);

  if (loading && shorts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="mt-4 text-base text-muted dark:text-muted-dark">
          Loading shorts feed…
        </Text>
      </View>
    );
  }

  if (error && shorts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-lg font-semibold text-text dark:text-text-dark">
          Shorts failed to load
        </Text>
        <Text className="mt-2 text-center text-sm text-muted dark:text-muted-dark">
          {error}
        </Text>
        <Pressable
          onPress={() => loadShorts(false)}
          className="mt-6 rounded-full bg-primary px-5 py-2 dark:bg-primary-dark"
        >
          <Text className="text-sm font-semibold uppercase tracking-wide text-primary-foreground dark:text-primary-foreground-dark">
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-4 pt-12 dark:bg-background-dark">
      <Text className="text-3xl font-semibold text-text dark:text-text-dark">
        Shorts
      </Text>
      <Text className="mt-2 text-base text-muted dark:text-muted-dark">
        Quick clips from the community. Tap any card to start watching.
      </Text>
      <FlatList
        data={shorts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: bottomPadding,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#38bdf8"
          />
        }
        ListEmptyComponent={() => (
          <View className="mt-12 rounded-3xl border border-border/60 bg-surface-muted/40 p-6 dark:border-border-dark/60 dark:bg-surface-muted-dark/40">
            <Text className="text-center text-sm text-muted dark:text-muted-dark">
              No shorts are available right now. Check back soon.
            </Text>
          </View>
        )}
        renderItem={({ item, index }) => {
          const durationLabel = getDurationLabel(item);

          return (
            <Pressable
              className="overflow-hidden rounded-3xl bg-card shadow-sm dark:bg-card-dark"
              style={{ marginBottom: index === shorts.length - 1 ? 0 : 20 }}
            >
              <Image source={{ uri: item.imageUrl }} className="h-64 w-full" />
              {durationLabel ? (
                <View className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-white">
                    {durationLabel}
                  </Text>
                </View>
              ) : null}
              <View className="p-4">
                <Text
                  className="text-lg font-semibold text-text dark:text-text-dark"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text className="mt-1 text-xs uppercase tracking-wide text-muted dark:text-muted-dark">
                  Swipe up for more
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
      {error && shorts.length ? (
        <View className="mb-8 rounded-3xl border border-red-500/30 bg-red-500/10 p-4">
          <Text className="text-sm font-semibold text-red-500 dark:text-red-400">
            Having trouble refreshing shorts.
          </Text>
          <Text className="mt-1 text-xs text-red-500/80 dark:text-red-200/80">
            {error}
          </Text>
          <Pressable
            onPress={() => loadShorts(false)}
            className="mt-3 self-start rounded-full bg-red-500 px-4 py-2 dark:bg-red-400"
          >
            <Text className="text-xs font-semibold uppercase tracking-wide text-white">
              Try again
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
