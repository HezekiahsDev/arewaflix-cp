import {
  CategoryChips,
  COMPACT_CARD_DIMENSIONS,
  EmptyState,
  FeaturedHero,
  SectionHeader,
  ShortsRail,
  VideoRail,
} from "@/components/ui/screens/home";
import {
  fetchFeaturedVideos,
  fetchFilteredVideos,
  fetchShorts,
  getVideosErrorMessage,
  Video,
} from "@/lib/api/videos";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const categories = [
  "All",
  "Film & Animation",
  "Music",
  "Sports",
  "Travel",
  "Gaming",
  "People & Blogs",
  "Comedy",
  "Entertainment",
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const bottomPadding = useMemo(
    () => Math.max(96, insets.bottom + 56),
    [insets.bottom]
  );
  const [featuredVideos, setFeaturedVideos] = useState<Video[]>([]);
  const [shortVideos, setShortVideos] = useState<Video[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([]);
  const [topVideos, setTopVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const featuredPromise = fetchFeaturedVideos({ limit: 5 });

      const [defaultVideos, popularVideos, topRatedVideos, shorts] =
        await Promise.all([
          featuredPromise,
          fetchFilteredVideos("popular", { limit: 8 }),
          fetchFilteredVideos("top_rated", { limit: 8 }),
          fetchShorts({ limit: 15 }),
        ]);

      setFeaturedVideos(defaultVideos);
      setTrendingVideos(popularVideos);
      setTopVideos(topRatedVideos);
      setShortVideos(shorts);
      setError(null);
    } catch (err) {
      setError(getVideosErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadContent(false);
  }, [loadContent]);

  const onRefresh = useCallback(() => {
    loadContent(true);
  }, [loadContent]);

  const hasData =
    featuredVideos.length +
      trendingVideos.length +
      topVideos.length +
      shortVideos.length >
    0;

  if (loading && !hasData) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="mt-4 text-base text-muted dark:text-muted-dark">
          Loading videos…
        </Text>
      </View>
    );
  }

  if (error && !hasData) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 text-center dark:bg-background-dark">
        <Text className="text-center text-lg font-semibold text-text dark:text-text-dark">
          Unable to reach the video service
        </Text>
        <Text className="mt-3 text-center text-sm text-muted dark:text-muted-dark">
          {error}
        </Text>
        <Pressable
          onPress={() => loadContent(false)}
          className="mt-6 rounded-full bg-primary px-5 py-2 dark:bg-primary-dark"
        >
          <Text className="text-sm font-semibold uppercase tracking-wide text-primary-foreground dark:text-primary-foreground-dark">
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  const heroItems = featuredVideos.slice(0, 5);

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#38bdf8"
        />
      }
    >
      {heroItems.length ? <FeaturedHero items={heroItems} /> : null}

      <View className="px-4 pt-10 pb-6">
        <SectionHeader title="Shorts" />
        {shortVideos.length ? (
          <ShortsRail items={shortVideos} />
        ) : (
          <EmptyState message="No shorts available right now." />
        )}

        <View className="mt-12">
          <SectionHeader title="Trending" ctaLabel="See all" />
          {trendingVideos.length ? (
            <VideoRail
              videos={trendingVideos}
              dimensions={COMPACT_CARD_DIMENSIONS}
              spacing={24}
              showRank
            />
          ) : (
            <EmptyState message="Trending videos will appear here soon." />
          )}
        </View>

        <View className="mt-12">
          <SectionHeader title="Categories" />
          <CategoryChips items={categories} />
        </View>

        <View className="mt-12">
          <SectionHeader title="Top videos" ctaLabel="See all" />
          {topVideos.length ? (
            <VideoRail videos={topVideos} />
          ) : (
            <EmptyState message="Top picks are being curated." />
          )}
        </View>

        {error ? (
          <View className="mt-10 rounded-3xl border border-red-500/30 bg-red-500/10 p-5">
            <Text className="text-sm font-semibold text-red-500 dark:text-red-400">
              Some sections couldn't load
            </Text>
            <Text className="mt-2 text-sm text-red-500/80 dark:text-red-200/80">
              {error}
            </Text>
            <Pressable
              onPress={() => loadContent(false)}
              className="mt-4 self-start rounded-full bg-red-500 px-4 py-2 dark:bg-red-400"
            >
              <Text className="text-xs font-semibold uppercase tracking-wide text-white">
                Try again
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
