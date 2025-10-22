import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Video,
  fetchFilteredVideos,
  getVideosErrorMessage,
} from "@/lib/api/videos";
import {
  buildVideoSubtitle,
  getAuthorLabel,
  getDurationLabel,
} from "@/lib/videos/formatters";
import { resolveVideoMedia } from "@/lib/videos/media";
import { useRouter } from "expo-router";

export default function TrendingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomPadding = useMemo(
    () => Math.max(96, insets.bottom + 56),
    [insets.bottom]
  );
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchFilteredVideos("popular", {
        limit: 20,
      });
      // Validate that data is an array
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format");
      }
      setVideos(data);
      setError(null);
    } catch (error) {
      const errorMessage =
        getVideosErrorMessage(error) || "Failed to load videos";
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    try {
      loadVideos(false);
    } catch (error) {
      // This should not happen since loadVideos has internal error handling,
      // but adding as a safety net
      setError("Failed to initialize video loading");
      setLoading(false);
    }
  }, [loadVideos]);

  const onRefresh = useCallback(() => {
    try {
      loadVideos(true);
    } catch (error) {
      // This should not happen since loadVideos has internal error handling,
      // but adding as a safety net
      setError("Failed to refresh videos");
      setRefreshing(false);
    }
  }, [loadVideos]);

  const handleVideoPress = useCallback(
    (video: Video) => {
      try {
        const media = resolveVideoMedia(video);

        if (media.kind === "direct") {
          router.push({
            pathname: "/player",
            params: {
              uri: media.uri,
              title: video.title,
              poster: video.imageUrl,
              videoId: video.id,
            },
          });
          return;
        }

        if (media.kind === "external") {
          Linking.openURL(media.watchUrl).catch((err) => {
            // Failed to open external URL
          });
          return;
        }

        if (video.videoLocation) {
          Linking.openURL(video.videoLocation).catch((err) => {
            // Failed to open videoLocation
          });
        }
      } catch (err) {
        // Error handling video press
      }
    },
    [router]
  );

  if (loading && videos.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="mt-4 text-base text-muted dark:text-muted-dark">
          Loading trending feed…
        </Text>
      </View>
    );
  }

  if (error && videos.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-lg font-semibold text-text dark:text-text-dark">
          We couldn't load the trending list
        </Text>
        <Text className="mt-2 text-center text-sm text-muted dark:text-muted-dark">
          {error}
        </Text>
        <Pressable
          onPress={() => {
            try {
              loadVideos(false);
            } catch (error) {
              setError("Failed to retry loading videos");
            }
          }}
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
        Trending
      </Text>
      <Text className="mt-2 text-base text-muted dark:text-muted-dark">
        The hottest videos on Arewaflix this week.
      </Text>
      <FlatList
        data={videos}
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
              No trending videos at the moment. Check back soon.
            </Text>
          </View>
        )}
        renderItem={({ item, index }) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          let durationLabel, authorLabel, subtitle;
          try {
            durationLabel = getDurationLabel(item);
            authorLabel = getAuthorLabel(item);
            subtitle = buildVideoSubtitle(item);
          } catch (err) {
            // Silently handle formatting errors
            durationLabel = null;
            authorLabel = null;
            subtitle = null;
          }

          const imageUri =
            item.imageUrl && typeof item.imageUrl === "string"
              ? item.imageUrl
              : null;
          const title =
            item.title && typeof item.title === "string"
              ? item.title
              : "Untitled Video";

          return (
            <Pressable
              onPress={() => handleVideoPress(item)}
              className="overflow-hidden rounded-3xl bg-card shadow-sm dark:bg-card-dark"
              style={{ marginBottom: index === videos.length - 1 ? 0 : 20 }}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} className="h-56 w-full" />
              ) : (
                <View className="h-56 w-full bg-surface-muted dark:bg-surface-muted-dark items-center justify-center">
                  <Text className="text-muted dark:text-muted-dark">
                    No Image
                  </Text>
                </View>
              )}
              {durationLabel ? (
                <View className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-white">
                    {durationLabel}
                  </Text>
                </View>
              ) : null}
              <View className="gap-2 p-4">
                <Text
                  className="text-xl font-semibold text-text dark:text-text-dark"
                  numberOfLines={2}
                >
                  {title}
                </Text>
                {authorLabel ? (
                  <Text className="text-xs uppercase tracking-wide text-muted dark:text-muted-dark">
                    {authorLabel}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text className="text-xs text-muted dark:text-muted-dark">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
      {error && videos.length ? (
        <View className="mb-8 rounded-3xl border border-red-500/30 bg-red-500/10 p-4">
          <Text className="text-sm font-semibold text-red-500 dark:text-red-400">
            Having trouble refreshing the feed.
          </Text>
          <Text className="mt-1 text-xs text-red-500/80 dark:text-red-200/80">
            {error}
          </Text>
          <Pressable
            onPress={() => {
              try {
                loadVideos(false);
              } catch (error) {
                setError("Failed to retry loading videos");
              }
            }}
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
