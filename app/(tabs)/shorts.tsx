import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
  ViewToken,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus, ResizeMode, Video as ExpoVideo } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  VIDEOS_API_BASE_URL,
  fetchShorts,
  getVideosErrorMessage,
  Video as VideoModel,
} from "@/lib/api/videos";
import { getDurationLabel } from "@/lib/videos/formatters";

function resolveVideoUri(video: VideoModel): string | undefined {
  const candidates = [
    video.videoLocation,
    typeof video.raw?.video_location === "string"
      ? (video.raw?.video_location as string)
      : undefined,
    typeof video.raw?.videoLocation === "string"
      ? (video.raw?.videoLocation as string)
      : undefined,
    typeof video.raw?.video_url === "string"
      ? (video.raw?.video_url as string)
      : undefined,
  ].filter(Boolean) as string[];

  const candidate = candidates.find(Boolean);
  if (!candidate) return undefined;

  if (/^https?:\/\//i.test(candidate)) {
    return candidate;
  }

  if (candidate.startsWith("//")) {
    return `https:${candidate}`;
  }

  const sanitized = candidate.replace(/^\/+/, "");
  return `${VIDEOS_API_BASE_URL}/${sanitized}`;
}

export default function ShortsScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [shorts, setShorts] = useState<VideoModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [statusById, setStatusById] = useState<
    Record<string, { isLoaded: boolean; isBuffering: boolean }>
  >({});

  const listRef = useRef<FlatList<VideoModel>>(null);
  const videoRefs = useRef<
    Map<string, React.ComponentRef<typeof ExpoVideo>>
  >(new Map());
  const isPausedRef = useRef(false);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });

  const registerVideoRef = useCallback(
    (id: string, ref: React.ComponentRef<typeof ExpoVideo> | null) => {
      if (!ref) {
        videoRefs.current.delete(id);
        return;
      }

      videoRefs.current.set(id, ref);
    },
    []
  );

  const unloadVideos = useCallback(() => {
    videoRefs.current.forEach((ref) => {
      if (!ref) return;

      try {
        void ref.stopAsync?.();
        void ref.unloadAsync?.();
      } catch (err) {
        console.warn("[ShortsScreen] Failed to unload video", err);
      }
    });

    videoRefs.current.clear();
  }, []);

  const handlePlaybackStatusUpdate = useCallback(
    (id: string) => (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        setStatusById((previous) => ({
          ...previous,
          [id]: { isLoaded: false, isBuffering: false },
        }));
        return;
      }

      setStatusById((previous) => ({
        ...previous,
        [id]: {
          isLoaded: true,
          isBuffering: status.isBuffering ?? false,
        },
      }));
    },
    []
  );

  const loadShorts = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await fetchShorts({ limit: 30, sort: "latest" });
        unloadVideos();
        setStatusById({});
        setShorts(data);
        setError(null);

        const firstId = data[0]?.id ?? null;
        setActiveIndex(0);
        setActiveVideoId(firstId);
        setIsPaused(false);
        isPausedRef.current = false;
      } catch (err) {
        console.error("[ShortsScreen] Failed to load shorts", err);
        setError(getVideosErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [unloadVideos]
  );

  useEffect(() => {
    loadShorts(false);
  }, [loadShorts]);

  useEffect(() => () => {
    unloadVideos();
  }, [unloadVideos]);

  const onRefresh = useCallback(() => loadShorts(true), [loadShorts]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (!viewableItems.length) {
        return;
      }

      const [primary] = viewableItems
        .filter((token) => token.isViewable && token.index != null)
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

      if (!primary) {
        return;
      }

      const nextIndex = primary.index ?? 0;
      const nextItem = primary.item as VideoModel | undefined;
      const nextId = nextItem?.id ?? null;
      const nextUri = nextItem ? resolveVideoUri(nextItem) : undefined;

      setActiveIndex(nextIndex);
      setActiveVideoId(nextId);
      setIsPaused(false);
      isPausedRef.current = false;

      videoRefs.current.forEach((ref, key) => {
        if (!ref) return;

        if (key === nextId && nextUri) {
          void ref.playAsync();
        } else {
          void ref.pauseAsync();
          void ref.setPositionAsync?.(0);
        }
      });
    }
  );

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

  const pageHeight = Math.max(windowHeight, 1);
  const topOffset = insets.top + 16;
  const bottomOffset = insets.bottom + 32;

  const renderShortItem = useCallback(
    ({ item, index }: { item: VideoModel; index: number }) => {
      const durationLabel = getDurationLabel(item);
      const videoUri = resolveVideoUri(item);
      const hasVideo = Boolean(videoUri);
      const isActive =
        activeVideoId !== null ? item.id === activeVideoId : index === activeIndex;
      const status = statusById[item.id];
      const isBuffering =
        hasVideo &&
        isActive &&
        (!status?.isLoaded || status?.isBuffering);
      const isPlaying = hasVideo && isActive && !isPaused && status?.isLoaded;

      const handleTogglePlayback = () => {
        if (!hasVideo || !isActive) {
          return;
        }

        setIsPaused((previous) => {
          const next = !previous;
          isPausedRef.current = next;
          const ref = videoRefs.current.get(item.id);

          if (ref) {
            if (next) {
              void ref.pauseAsync();
            } else {
              void ref.playAsync();
            }
          }

          return next;
        });
      };

      return (
        <View style={{ height: pageHeight }}>
          <Pressable
            className="flex-1"
            accessibilityRole={hasVideo ? "button" : undefined}
            accessibilityHint={
              hasVideo
                ? isPaused
                  ? "Resume playback"
                  : "Pause playback"
                : undefined
            }
            onPress={hasVideo ? handleTogglePlayback : undefined}
          >
            <View className="flex-1 bg-black">
              {hasVideo ? (
                <ExpoVideo
                  ref={(ref) => registerVideoRef(item.id, ref)}
                  source={{ uri: videoUri! }}
                  style={{ flex: 1 }}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={isPlaying}
                  isLooping
                  isMuted={false}
                  useNativeControls={false}
                  posterSource={
                    item.imageUrl ? { uri: item.imageUrl } : undefined
                  }
                  usePoster={!status?.isLoaded}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate(item.id)}
                  onError={(err) => {
                    console.error(
                      `[ShortsScreen] Playback error for ${item.id}`,
                      err
                    );
                  }}
                />
              ) : (
                <Image
                  source={{ uri: item.imageUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              )}
            </View>

            {isBuffering ? (
              <View className="absolute inset-0 items-center justify-center">
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            ) : null}

            {hasVideo && isActive ? (
              <View
                pointerEvents="none"
                className="absolute left-0 right-0 items-center"
                style={{ top: topOffset + 48 }}
              >
                {isPaused ? (
                  <Ionicons name="play-circle" size={80} color="#ffffff" />
                ) : null}
              </View>
            ) : null}

            <View
              pointerEvents="none"
              className="absolute left-0 right-0 px-4"
              style={{ top: topOffset }}
            >
              <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                Shorts
              </Text>
              <Text className="mt-2 text-3xl font-semibold text-white">
                {index + 1} / {shorts.length}
              </Text>
            </View>

            {durationLabel ? (
              <View
                pointerEvents="none"
                className="absolute right-4 rounded-full bg-black/70 px-3 py-1"
                style={{ top: topOffset }}
              >
                <Text className="text-xs font-semibold uppercase tracking-wide text-white">
                  {durationLabel}
                </Text>
              </View>
            ) : null}

            <View
              pointerEvents="none"
              className="absolute left-0 right-0 px-4"
              style={{ bottom: bottomOffset }}
            >
              <View className="rounded-3xl bg-black/65 p-5">
                <Text
                  className="text-lg font-semibold text-white"
                  numberOfLines={3}
                >
                  {item.title}
                </Text>
                {item.author ? (
                  <Text className="mt-2 text-xs uppercase tracking-wide text-white/70">
                    {item.author}
                  </Text>
                ) : null}
                <Text className="mt-3 text-xs uppercase tracking-wide text-white/60">
                  {hasVideo && isActive
                    ? `Tap to ${isPaused ? "play" : "pause"} • Swipe up for more`
                    : "Swipe up for more"}
                </Text>
              </View>
            </View>

            {!hasVideo ? (
              <View
                pointerEvents="none"
                className="absolute bottom-28 left-0 right-0 px-4"
              >
                <View className="rounded-2xl bg-black/70 p-4">
                  <Text className="text-center text-xs uppercase tracking-wide text-white/70">
                    Video source unavailable. Showing preview image.
                  </Text>
                </View>
              </View>
            ) : null}
          </Pressable>
        </View>
      );
    },
    [
      activeIndex,
      activeVideoId,
      bottomOffset,
      handlePlaybackStatusUpdate,
      isPaused,
      pageHeight,
      registerVideoRef,
      shorts.length,
      statusById,
      topOffset,
    ]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<VideoModel> | null | undefined, index: number) => ({
      length: pageHeight,
      offset: pageHeight * index,
      index,
    }),
    [pageHeight]
  );

  const emptyContentContainerStyle = shorts.length
    ? undefined
    : {
        flexGrow: 1,
        justifyContent: "center" as const,
        paddingHorizontal: 24,
      };

  return (
    <View className="flex-1 bg-black dark:bg-black">
      <FlatList
        ref={listRef}
        data={shorts}
        keyExtractor={(item) => item.id}
        renderItem={renderShortItem}
        showsVerticalScrollIndicator={false}
        pagingEnabled
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={pageHeight}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#38bdf8"
          />
        }
        ListEmptyComponent={() => (
          <View className="rounded-3xl border border-border/60 bg-surface-muted/40 p-6 dark:border-border-dark/60 dark:bg-surface-muted-dark/40">
            <Text className="text-center text-sm text-muted dark:text-muted-dark">
              No shorts are available right now. Check back soon.
            </Text>
          </View>
        )}
        contentContainerStyle={emptyContentContainerStyle}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        initialNumToRender={3}
        windowSize={5}
      />
      {error && shorts.length ? (
        <View
          className="absolute left-4 right-4 rounded-3xl border border-red-500/30 bg-red-500/10 p-4"
          style={{ bottom: insets.bottom + 24 }}
        >
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
