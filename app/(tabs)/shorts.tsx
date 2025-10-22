import { useIsFocused } from "@react-navigation/native";
import { AVPlaybackStatus, Video as ExpoVideo, ResizeMode } from "expo-av";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Video as VideoModel,
  fetchShorts,
  getVideosErrorMessage,
} from "@/lib/api/videos";
import { getDurationLabel } from "@/lib/videos/formatters";
import {
  VideoMedia,
  collectMediaCandidates,
  resolveVideoMedia,
} from "@/lib/videos/media";

type ShortMedia =
  | { kind: "video"; uri: string }
  | { kind: "external"; videoId: string; watchUrl: string }
  | { kind: "none" };

type PlayableShort = {
  video: VideoModel;
  source:
    | {
        uri: string;
        origin: "direct";
      }
    | {
        uri: null;
        watchUrl: string;
        videoId: string;
        origin: "external";
      };
};

function toShortMedia(media: VideoMedia): ShortMedia {
  if (media.kind === "direct") {
    return { kind: "video", uri: media.uri };
  }

  if (media.kind === "external") {
    return {
      kind: "external",
      videoId: media.videoId,
      watchUrl: media.watchUrl,
    };
  }

  return { kind: "none" };
}

function resolveShortMedia(video: VideoModel): {
  media: VideoMedia;
  short: ShortMedia;
} {
  const candidates = collectMediaCandidates(video);

  console.log(
    `[Shorts] Video ${video.id} (${video.title}) media candidates:`,
    candidates
  );
  console.log(
    `[Shorts] Video ${video.id} has videoLocation:`,
    video.videoLocation
  );

  const media = resolveVideoMedia(video);
  const short = toShortMedia(media);

  if (media.kind === "direct") {
    console.log(
      `[Shorts] Video ${video.id} resolved as direct video: ${media.uri}`
    );
  } else {
    console.log(`[Shorts] Video ${video.id} has no playable media`);
  }

  return { media, short };
}

async function resolvePlayableSource(
  video: VideoModel
): Promise<PlayableShort["source"] | null> {
  const { short } = resolveShortMedia(video);

  if (short.kind === "video") {
    return { uri: short.uri, origin: "direct" };
  }

  if (short.kind === "external") {
    return {
      uri: null,
      watchUrl: short.watchUrl,
      videoId: short.videoId,
      origin: "external",
    };
  }

  return null;
}

type ShortPlayerCardProps = {
  item: PlayableShort;
  isActive: boolean;
  topInset: number;
  bottomInset: number;
};

function ShortPlayerCard({
  item,
  isActive,
  topInset,
  bottomInset,
}: ShortPlayerCardProps) {
  const videoRef = useRef<ExpoVideo>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);

  useEffect(() => {
    if (item.source.origin === "external") return;

    const player = videoRef.current;
    if (!player) return;

    if (isActive && !hasError) {
      player.playAsync().catch((error) => {
        console.warn("[ShortPlayerCard] play failed", error);
      });
    } else {
      player.pauseAsync().catch(() => {
        /* no-op */
      });
    }
  }, [isActive, hasError, item.source]);

  const handleStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setHasError("Unable to load video");
      return;
    }

    setIsBuffering(status.isBuffering ?? false);
  }, []);

  const handleError = useCallback((error: string) => {
    console.error("[ShortPlayerCard] playback error", error);
    setHasError("Playback error");
  }, []);

  const router = useRouter();

  const handleExternalVideoPress = useCallback(() => {
    if (item.source.origin === "external") {
      Linking.openURL(item.source.watchUrl).catch((err) => {
        console.error("Failed to open external URL:", err);
      });
    }
  }, [item.source]);

  const durationLabel = useMemo(
    () => getDurationLabel(item.video),
    [item.video]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {item.source.origin === "direct" ? (
        <ExpoVideo
          ref={videoRef}
          style={{ flex: 1 }}
          source={{ uri: item.source.uri }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={isActive && !hasError}
          isLooping
          volume={1}
          posterSource={{ uri: item.video.imageUrl }}
          posterStyle={{ resizeMode: "cover" }}
          usePoster
          onPlaybackStatusUpdate={handleStatusUpdate}
          onError={handleError}
          onLoadStart={() => setIsBuffering(true)}
          onLoad={() => setIsBuffering(false)}
        />
      ) : (
        <Pressable style={{ flex: 1 }} onPress={handleExternalVideoPress}>
          <Image
            source={{ uri: item.video.imageUrl }}
            style={{ flex: 1 }}
            resizeMode="cover"
          />

          {/* Play Button Overlay for External Videos */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.3)",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.7)",
                borderRadius: 50,
                width: 80,
                height: 80,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 24 }}>▶</Text>
            </View>
            <Text
              style={{
                color: "#fff",
                fontSize: 14,
                fontWeight: "600",
                marginTop: 12,
                textAlign: "center",
                backgroundColor: "rgba(0,0,0,0.6)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
              }}
            >
              Tap to Open in Browser
            </Text>
          </View>
        </Pressable>
      )}

      <View
        style={{
          position: "absolute",
          top: topInset + 16,
          left: 16,
          right: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "rgba(0,0,0,0.45)",
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
            }}
          >
            {item.source.origin === "external"
              ? "External Video"
              : "Direct Video"}
          </Text>
        </View>
        {durationLabel ? (
          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.45)",
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
              {durationLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: bottomInset + 32,
          backgroundColor: "rgba(0,0,0,0.4)",
          borderRadius: 20,
          paddingHorizontal: 18,
          paddingVertical: 16,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "700",
          }}
          numberOfLines={2}
        >
          {item.video.title}
        </Text>
        {item.video.author ? (
          <Text
            style={{
              color: "rgba(255,255,255,0.85)",
              marginTop: 6,
              fontSize: 13,
              fontWeight: "600",
              textTransform: "uppercase",
            }}
          >
            {item.video.author}
          </Text>
        ) : null}
      </View>

      {(isBuffering || hasError) && (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: hasError ? "rgba(0,0,0,0.6)" : "transparent",
          }}
        >
          {hasError ? (
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 18,
                borderRadius: 16,
                backgroundColor: "rgba(0,0,0,0.7)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                Unable to play this short
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                Please swipe to the next one.
              </Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color="#ffffff" />
          )}
        </View>
      )}
    </View>
  );
}

export default function ShortsScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [shorts, setShorts] = useState<PlayableShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupportedCount, setUnsupportedCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const requestRef = useRef<AbortController | null>(null);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const firstVisible = viewableItems.find(
        (item) => typeof item.index === "number"
      );
      if (firstVisible && typeof firstVisible.index === "number") {
        setActiveIndex(firstVisible.index);
      }
    }
  ).current;

  const hydrateShorts = useCallback(
    async (videos: VideoModel[], signal?: AbortSignal) => {
      const playable: PlayableShort[] = [];
      let unsupported = 0;

      for (const video of videos) {
        if (signal?.aborted) break;
        console.log(`[Shorts] Processing video ${video.id}: "${video.title}"`);
        const source = await resolvePlayableSource(video);
        if (signal?.aborted) break;
        if (source) {
          console.log(
            source.origin === "external"
              ? `[Shorts] ✓ Video ${video.id} resolved to ${source.origin}: ${source.watchUrl}`
              : `[Shorts] ✓ Video ${video.id} resolved to ${source.origin}: ${source.uri?.substring(0, 100)}...`
          );
          playable.push({ video, source });
        } else {
          console.log(`[Shorts] ✗ Video ${video.id} could not be resolved`);
          unsupported += 1;
        }
      }

      return { playable, unsupported };
    },
    []
  );

  const loadShorts = useCallback(
    async (isRefresh = false) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const videos = await fetchShorts({
          limit: 40,
          sort: "latest",
          signal: controller.signal,
        });

        console.log(
          "[Shorts] Fetched videos from backend:",
          videos.map((v) => ({
            id: v.id,
            title: v.title,
            videoLocation: v.videoLocation,
            rawKeys: Object.keys(v.raw || {}),
          }))
        );

        const { playable, unsupported } = await hydrateShorts(
          videos,
          controller.signal
        );

        if (controller.signal.aborted) {
          return;
        }

        if (!playable.length) {
          setError(
            unsupported
              ? "None of the available shorts are playable right now."
              : "No shorts available yet."
          );
        } else {
          setError(null);
        }

        setShorts(playable);
        setUnsupportedCount(unsupported);
        setActiveIndex(0);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("[ShortsScreen] Failed to load shorts", err);
        setError(getVideosErrorMessage(err));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [hydrateShorts]
  );

  useEffect(() => {
    void loadShorts();

    return () => {
      requestRef.current?.abort();
    };
  }, [loadShorts]);

  const handleRefresh = useCallback(() => {
    void loadShorts(true);
  }, [loadShorts]);

  const renderItem = useCallback(
    ({ item, index }: { item: PlayableShort; index: number }) => (
      <ShortPlayerCard
        item={item}
        isActive={isFocused && index === activeIndex}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />
    ),
    [activeIndex, insets.bottom, insets.top, isFocused]
  );

  if (loading && !refreshing && shorts.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
        <Text
          style={{
            color: "rgba(255,255,255,0.75)",
            marginTop: 12,
            fontSize: 14,
          }}
        >
          Loading shorts…
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList
        data={shorts}
        keyExtractor={(item) => item.video.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={3}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#ffffff"
            colors={["#ffffff"]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 32,
                backgroundColor: "#000",
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {error ?? "No shorts available yet."}
              </Text>
            </View>
          ) : null
        }
      />

      {unsupportedCount > 0 ? (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 12,
            left: 16,
            right: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 14,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            {unsupportedCount} short
            {unsupportedCount === 1 ? "" : "s"} are still processing and
            temporarily unavailable.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
