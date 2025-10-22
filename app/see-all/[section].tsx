import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  fetchFilteredVideos,
  fetchRandomVideos,
  fetchShorts,
  getVideosErrorMessage,
  Video,
} from "@/lib/api/videos";
import {
  buildVideoSubtitle,
  getAuthorLabel,
  getDurationLabel,
} from "@/lib/videos/formatters";
import { resolveVideoMedia } from "@/lib/videos/media";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const screenWidth = Dimensions.get("window").width;
const CARD_MARGIN = 16;
const NUM_COLUMNS = 2;
const CARD_WIDTH =
  (screenWidth - CARD_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS;
const CARD_HEIGHT = 260;
const THUMBNAIL_HEIGHT = 160;

const ITEMS_PER_PAGE = 20;

type SectionType = "trending" | "top" | "explore" | "shorts";

type SectionConfig = {
  title: string;
  fetchFunction: (page: number) => Promise<Video[]>;
};

export default function SeeAllScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const sectionConfig: SectionConfig = useMemo(() => {
    const sectionType = section as SectionType;

    const configs: Record<SectionType, SectionConfig> = {
      trending: {
        title: "Trending Videos",
        fetchFunction: (page: number) =>
          fetchFilteredVideos("popular", { limit: ITEMS_PER_PAGE, page }),
      },
      top: {
        title: "Top Videos",
        fetchFunction: (page: number) =>
          fetchFilteredVideos("top_rated", { limit: ITEMS_PER_PAGE, page }),
      },
      explore: {
        title: "Explore",
        fetchFunction: (page: number) =>
          fetchRandomVideos({ limit: ITEMS_PER_PAGE, page }),
      },
      shorts: {
        title: "Shorts",
        fetchFunction: (page: number) =>
          fetchShorts({ limit: ITEMS_PER_PAGE, page }),
      },
    };

    return (
      configs[sectionType] || {
        title: "Videos",
        fetchFunction: (page: number) =>
          fetchRandomVideos({ limit: ITEMS_PER_PAGE, page }),
      }
    );
  }, [section]);

  const loadVideos = useCallback(
    async (page: number, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
        setCurrentPage(1);
        setHasMore(true);
      } else if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const newVideos = await sectionConfig.fetchFunction(page);

        if (isRefresh || page === 1) {
          setVideos(newVideos);
        } else {
          setVideos((prev) => [...prev, ...newVideos]);
        }

        setHasMore(newVideos.length === ITEMS_PER_PAGE);
        setError(null);
      } catch (err) {
        setError(getVideosErrorMessage(err));
        if (page === 1) {
          setVideos([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [sectionConfig]
  );

  useEffect(() => {
    loadVideos(1);
  }, [loadVideos]);

  const handleRefresh = useCallback(() => {
    loadVideos(1, true);
  }, [loadVideos]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && !loading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadVideos(nextPage);
    }
  }, [loadingMore, loading, hasMore, currentPage, loadVideos]);

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
            console.error("Failed to open external URL:", err);
          });
          return;
        }

        if (video.videoLocation) {
          void Linking.openURL(video.videoLocation).catch((err) =>
            console.error("Failed to open videoLocation:", err)
          );
        }
      } catch (err) {
        console.error("Error handling video press:", err);
      }
    },
    [router]
  );

  const renderVideoCard = useCallback(
    ({ item }: { item: Video }) => {
      const durationLabel = getDurationLabel(item);
      const authorLabel = getAuthorLabel(item);
      const subtitle = buildVideoSubtitle(item);

      return (
        <Pressable
          onPress={() => handleVideoPress(item)}
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            margin: CARD_MARGIN / 2,
          }}
          className="overflow-hidden rounded-2xl bg-card shadow-sm dark:bg-card-dark"
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: "100%", height: THUMBNAIL_HEIGHT }}
          />
          {durationLabel ? (
            <View className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-white">
                {durationLabel}
              </Text>
            </View>
          ) : null}
          <View className="flex-1 justify-between gap-1 px-3 py-3">
            <Text
              className="text-sm font-semibold text-text dark:text-text-dark"
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {authorLabel ? (
              <Text className="text-xs uppercase tracking-wide text-muted dark:text-muted-dark">
                {authorLabel}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                className="text-xs text-muted dark:text-muted-dark"
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [handleVideoPress]
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    return (
      <View className="flex-1 items-center justify-center px-6 py-20">
        <Text className="text-center text-lg font-semibold text-text dark:text-text-dark">
          No videos found
        </Text>
        <Text className="mt-3 text-center text-sm text-muted dark:text-muted-dark">
          {error || "Try refreshing to load videos"}
        </Text>
        {error && (
          <Pressable
            onPress={handleRefresh}
            className="mt-6 rounded-full bg-primary px-5 py-2 dark:bg-primary-dark"
          >
            <Text className="text-sm font-semibold uppercase tracking-wide text-primary-foreground dark:text-primary-foreground-dark">
              Retry
            </Text>
          </Pressable>
        )}
      </View>
    );
  }, [loading, error, handleRefresh]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View className="items-center justify-center py-6">
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }, [loadingMore, theme.primary]);

  const bottomPadding = useMemo(
    () => Math.max(96, insets.bottom + 56),
    [insets.bottom]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: sectionConfig.title,
          headerShown: true,
        }}
      />
      <View className="flex-1 bg-background dark:bg-background-dark">
        {loading && videos.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.primary} />
            <Text className="mt-4 text-sm text-muted dark:text-muted-dark">
              Loading videos...
            </Text>
          </View>
        ) : (
          <FlatList
            data={videos}
            renderItem={renderVideoCard}
            keyExtractor={(item) => item.id}
            numColumns={NUM_COLUMNS}
            contentContainerStyle={{
              paddingTop: CARD_MARGIN / 2,
              paddingBottom: bottomPadding,
            }}
            columnWrapperStyle={{
              paddingHorizontal: CARD_MARGIN / 2,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={theme.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
          />
        )}
      </View>
    </>
  );
}
