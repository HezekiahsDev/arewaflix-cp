import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  formatRelativeDate,
  formatViewCount,
  searchVideos,
  Video,
} from "@/lib/api/videos";

type FilterState = {
  approved: 0 | 1 | undefined;
  privacy: 0 | 1 | undefined;
  featured: 0 | 1 | undefined;
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();

  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    approved: undefined,
    privacy: undefined,
    featured: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);

  const query = params.q || "";
  const limit = 20;

  const bottomPadding = useMemo(
    () => Math.max(96, insets.bottom + 56),
    [insets.bottom]
  );

  const performSearch = useCallback(
    async (searchPage: number, reset: boolean = false) => {
      if (!query.trim()) {
        setVideos([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await searchVideos({
          q: query,
          page: searchPage,
          limit,
          approved: filters.approved,
          privacy: filters.privacy,
          featured: filters.featured,
        });

        if (reset) {
          setVideos(results);
        } else {
          setVideos((prev) => [...prev, ...results]);
        }

        setHasMore(results.length === limit);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to search videos"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [query, filters, limit]
  );

  // Reset and search when query or filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    performSearch(1, true);
  }, [query, filters.approved, filters.privacy, filters.featured]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      performSearch(nextPage, false);
    }
  }, [isLoading, hasMore, page, performSearch]);

  const handleVideoPress = useCallback(
    (video: Video) => {
      router.push({
        pathname: "/player",
        params: { videoId: video.slug || video.id },
      });
    },
    [router]
  );

  const toggleFilter = useCallback((key: keyof FilterState) => {
    setFilters((prev) => {
      const current = prev[key];
      const next = current === undefined ? 1 : current === 1 ? 0 : undefined;
      return { ...prev, [key]: next };
    });
  }, []);

  const renderEmptyState = () => {
    if (!query.trim()) {
      return (
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Feather name="search" size={64} color={palette.textMuted} />
          <Text className="mt-4 text-center text-xl font-semibold text-text dark:text-text-dark">
            Search for videos
          </Text>
          <Text className="mt-2 text-center text-base text-muted dark:text-muted-dark">
            Use the search bar at the top to find videos
          </Text>
        </View>
      );
    }

    if (isLoading && videos.length === 0) {
      return (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" color={palette.tint} />
          <Text className="mt-4 text-base text-muted dark:text-muted-dark">
            Searching...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Feather name="alert-circle" size={64} color={palette.danger} />
          <Text className="mt-4 text-center text-xl font-semibold text-text dark:text-text-dark">
            Something went wrong
          </Text>
          <Text className="mt-2 text-center text-base text-muted dark:text-muted-dark">
            {error}
          </Text>
          <Pressable
            onPress={() => performSearch(1, true)}
            className="mt-6 rounded-full bg-primary px-6 py-3 dark:bg-primary-dark"
          >
            <Text className="font-semibold text-white">Try again</Text>
          </Pressable>
        </View>
      );
    }

    if (videos.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-6 py-12">
          <Feather name="video-off" size={64} color={palette.textMuted} />
          <Text className="mt-4 text-center text-xl font-semibold text-text dark:text-text-dark">
            No results found
          </Text>
          <Text className="mt-2 text-center text-base text-muted dark:text-muted-dark">
            Try adjusting your search or filters
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderFooter = () => {
    if (!isLoading || videos.length === 0) return null;

    return (
      <View className="py-4">
        <ActivityIndicator size="small" color={palette.tint} />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View className="border-b border-border px-4 pt-12 pb-4 dark:border-border-dark">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-semibold text-text dark:text-text-dark">
              Search Results
            </Text>
            {query.trim() && (
              <Text className="mt-1 text-sm text-muted dark:text-muted-dark">
                {videos.length} result{videos.length !== 1 ? "s" : ""} for "
                {query}"
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            className="rounded-full bg-surface-muted p-2 dark:bg-surface-muted-dark"
          >
            <Feather name="sliders" size={20} color={palette.text} />
          </Pressable>
        </View>

        {/* Filters */}
        {showFilters && (
          <View className="mt-4 gap-2">
            <Text className="text-sm font-semibold text-text dark:text-text-dark">
              Filters
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-2"
            >
              <FilterChip
                label="Approved"
                value={filters.approved}
                onPress={() => toggleFilter("approved")}
                palette={palette}
              />
              <FilterChip
                label="Public"
                value={filters.privacy}
                onPress={() => toggleFilter("privacy")}
                palette={palette}
              />
              <FilterChip
                label="Featured"
                value={filters.featured}
                onPress={() => toggleFilter("featured")}
                palette={palette}
              />
            </ScrollView>
          </View>
        )}
      </View>

      {/* Results */}
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VideoResultCard video={item} onPress={handleVideoPress} />
        )}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: bottomPadding,
        }}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

type FilterChipProps = {
  label: string;
  value: 0 | 1 | undefined;
  onPress: () => void;
  palette: typeof Colors.light | typeof Colors.dark;
};

function FilterChip({ label, value, onPress, palette }: FilterChipProps) {
  const getBackgroundColor = () => {
    if (value === 1) return palette.tint;
    if (value === 0) return palette.danger;
    return "transparent";
  };

  const getBorderColor = () => {
    if (value === undefined) return palette.border;
    return "transparent";
  };

  const getTextColor = () => {
    if (value === undefined) return palette.text;
    return "#FFFFFF";
  };

  const getLabel = () => {
    if (value === 1) return `✓ ${label}`;
    if (value === 0) return `✗ ${label}`;
    return label;
  };

  return (
    <Pressable
      onPress={onPress}
      className="rounded-full px-4 py-2"
      style={{
        backgroundColor: getBackgroundColor(),
        borderWidth: 1,
        borderColor: getBorderColor(),
      }}
    >
      <Text className="text-sm font-medium" style={{ color: getTextColor() }}>
        {getLabel()}
      </Text>
    </Pressable>
  );
}

type VideoResultCardProps = {
  video: Video;
  onPress: (video: Video) => void;
};

function VideoResultCard({ video, onPress }: VideoResultCardProps) {
  return (
    <Pressable
      onPress={() => onPress(video)}
      className="flex-row gap-3 px-4 py-3"
    >
      {/* Thumbnail */}
      <View
        className="relative overflow-hidden rounded-lg"
        style={{ width: 168, height: 94 }}
      >
        <Image
          source={{ uri: video.imageUrl }}
          className="h-full w-full"
          resizeMode="cover"
        />
        {video.duration && (
          <View className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5">
            <Text className="text-xs font-semibold text-white">
              {video.duration}
            </Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 justify-start py-1">
        <Text
          className="text-sm font-semibold text-text dark:text-text-dark"
          numberOfLines={2}
        >
          {video.title}
        </Text>
        {video.author && (
          <Text
            className="mt-1 text-xs text-muted dark:text-muted-dark"
            numberOfLines={1}
          >
            {video.author}
          </Text>
        )}
        <View className="mt-1 flex-row items-center gap-1">
          {video.views !== undefined && (
            <Text className="text-xs text-muted dark:text-muted-dark">
              {formatViewCount(video.views)}
            </Text>
          )}
          {video.views !== undefined && video.createdAt && (
            <Text className="text-xs text-muted dark:text-muted-dark">•</Text>
          )}
          {video.createdAt && (
            <Text className="text-xs text-muted dark:text-muted-dark">
              {formatRelativeDate(video.createdAt)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
