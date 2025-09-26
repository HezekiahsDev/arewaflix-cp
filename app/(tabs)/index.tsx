import StarBarsIcon from "@/assets/icons/icon-pack-one";
import {
  Video,
  fetchFeaturedVideos,
  fetchFilteredVideos,
  fetchShorts,
  getVideosErrorMessage,
} from "@/lib/api/videos";
import {
  buildHeroMeta,
  buildVideoSubtitle,
  getAuthorLabel,
  getDurationLabel,
} from "@/lib/videos/formatters";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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

const screenWidth = Dimensions.get("window").width;
const DEFAULT_RAIL_SPACING = 16;
const DEFAULT_CARD_DIMENSIONS = {
  width: Math.min(screenWidth * 0.72, 320),
  height: 280,
  thumbnailHeight: 176,
};
const COMPACT_CARD_DIMENSIONS = {
  width: 128,
  height: 192,
  thumbnailHeight: 128,
};

const AnimatedImageBackground =
  Animated.createAnimatedComponent(ImageBackground);

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
              spacing={12}
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

type FeaturedItem = Video;
type ShortItem = Video;
type VideoItem = Video;

type SectionHeaderProps = {
  title: string;
  ctaLabel?: string;
  onPress?: () => void;
};

function SectionHeader({ title, ctaLabel, onPress }: SectionHeaderProps) {
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

type FeaturedHeroProps = {
  items: FeaturedItem[];
};

function FeaturedHero({ items }: FeaturedHeroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const transition = useRef(new Animated.Value(0)).current;

  const scale = useMemo(
    () =>
      transition.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1],
      }),
    [transition]
  );

  const animatedStyles = useMemo(
    () => ({
      opacity: transition,
      transform: [{ scale }],
    }),
    [scale, transition]
  );

  useEffect(() => {
    if (items.length <= 1) {
      setActiveIndex(0);
      return undefined;
    }

    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 6000);

    return () => clearInterval(id);
  }, [items.length]);

  useEffect(() => {
    if (activeIndex > items.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, items.length]);

  const item = items[activeIndex] ?? items[0];
  const metaLine = useMemo(() => buildHeroMeta(item), [item]);

  useEffect(() => {
    if (!items.length) {
      return;
    }

    transition.setValue(0);

    Animated.timing(transition, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, items.length, transition]);

  if (!item) {
    return null;
  }

  return (
    <View style={styles.featuredHeroContainer}>
      <AnimatedImageBackground
        source={{ uri: item.imageUrl }}
        className="h-72 w-full"
        style={animatedStyles}
      >
        <View className="absolute inset-0 bg-black/40" />
        <View className="flex-1 justify-end p-6">
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <StarBarsIcon size={16} color="#f59e0b" />
            <Text
              style={{ marginLeft: 8 }}
              className="text-sm font-semibold uppercase tracking-widest"
            >
              <Text style={{ color: "#f59e0b" }}>Featured video</Text>
            </Text>
          </View>
          <Text
            className="mt-3 text-3xl font-semibold text-white"
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {metaLine ? (
            <Text className="mt-2 text-sm text-white/80">{metaLine}</Text>
          ) : null}
          <Pressable
            className="mt-5 self-start w-24 rounded-full px-5 py-2"
            style={{ backgroundColor: "rgba(14,165,233,0.70)" }}
          >
            <Text className="text-base text-center font-semibold uppercase tracking-wide text-white">
              Play
            </Text>
          </Pressable>
        </View>
        {items.length > 1 ? (
          <View className="absolute bottom-5 left-0 right-0 flex-row justify-center gap-2">
            {items.map((_, index) => (
              <View
                key={index}
                className={`h-2 w-2 rounded-full ${index === activeIndex ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </View>
        ) : null}
      </AnimatedImageBackground>
    </View>
  );
}

type ShortsRailProps = {
  items: ShortItem[];
};

function ShortsRail({ items }: ShortsRailProps) {
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

type VideoRailProps = {
  videos: VideoItem[];
  dimensions?: VideoCardDimensions;
  spacing?: number;
};

function VideoRail({
  videos,
  dimensions = DEFAULT_CARD_DIMENSIONS,
  spacing = DEFAULT_RAIL_SPACING,
}: VideoRailProps) {
  return (
    <FlatList
      data={videos}
      horizontal
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: spacing }}
      renderItem={({ item, index }) => (
        <VideoRailItem
          item={item}
          index={index}
          videosLength={videos.length}
          dimensions={dimensions}
          spacing={spacing}
        />
      )}
    />
  );
}

type VideoCardDimensions = typeof DEFAULT_CARD_DIMENSIONS;

type VideoRailItemProps = {
  item: VideoItem;
  index: number;
  videosLength: number;
  dimensions: VideoCardDimensions;
  spacing: number;
};

function VideoRailItem({
  item,
  index,
  videosLength,
  dimensions,
  spacing,
}: VideoRailItemProps) {
  return (
    <View
      style={{
        width: dimensions.width,
        height: dimensions.height,
        marginRight: index === videosLength - 1 ? 0 : spacing,
      }}
    >
      <VideoCard video={item} dimensions={dimensions} />
    </View>
  );
}

type VideoCardProps = {
  video: VideoItem;
  dimensions?: VideoCardDimensions;
};

function VideoCard({ video, dimensions = DEFAULT_CARD_DIMENSIONS }: VideoCardProps) {
  const durationLabel = getDurationLabel(video);
  const authorLabel = getAuthorLabel(video);
  const subtitle = buildVideoSubtitle(video);
  const isCompact = dimensions.height <= 200;

  return (
    <Pressable
      className="overflow-hidden rounded-2xl bg-card shadow-sm dark:bg-card-dark"
      style={{
        width: "100%",
        height: dimensions.height,
      }}
    >
      <Image
        source={{ uri: video.imageUrl }}
        className="w-full"
        style={{ height: dimensions.thumbnailHeight }}
      />
      {durationLabel ? (
        <View className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-white">
            {durationLabel}
          </Text>
        </View>
      ) : null}
      <View
        className="gap-1"
        style={{
          flex: 1,
          justifyContent: "space-between",
          paddingHorizontal: isCompact ? 12 : 16,
          paddingVertical: isCompact ? 10 : 16,
        }}
      >
        <Text
          className="text-base font-semibold text-text dark:text-text-dark"
          numberOfLines={isCompact ? 2 : 3}
        >
          {video.title}
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
}

type CategoryChipsProps = {
  items: string[];
};

function CategoryChips({ items }: CategoryChipsProps) {
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

type EmptyStateProps = {
  message: string;
};

function EmptyState({ message }: EmptyStateProps) {
  return (
    <View className="mt-6 rounded-2xl border border-border/60 bg-surface-muted/40 px-4 py-10 dark:border-border-dark/60 dark:bg-surface-muted-dark/40">
      <Text className="text-center text-sm text-muted dark:text-muted-dark">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  featuredHeroContainer: {
    overflow: "hidden",
  },
});
