import { VideoIcon } from "@/assets/icons/icon-pack-one";
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
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

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

  const media = resolveVideoMedia(video);
  const short = toShortMedia(media);

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

const IconDefaults = { size: 28, color: "#fff" } as const;

const HeartIcon: React.FC<{ size?: number; color?: string }> = ({
  size = IconDefaults.size,
  color = IconDefaults.color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
      fill={color}
    />
  </Svg>
);

const CommentIcon: React.FC<{ size?: number; color?: string }> = ({
  size = IconDefaults.size,
  color = IconDefaults.color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      fill={color}
    />
  </Svg>
);

const ShareIcon: React.FC<{ size?: number; color?: string }> = ({
  size = IconDefaults.size,
  color = IconDefaults.color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 6l-4-4-4 4"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 2v13"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const VolumeIcon: React.FC<{ size?: number; color?: string }> = ({
  size = IconDefaults.size,
  color = IconDefaults.color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 5L6 9H2v6h4l5 4V5z" fill={color} />
    <Path
      d="M19 8a5 5 0 0 1 0 8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const VolumeOffIcon: React.FC<{ size?: number; color?: string }> = ({
  size = IconDefaults.size,
  color = IconDefaults.color,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 5L6 9H2v6h4l5 4V5z" fill={color} />
    <Path
      d="M23 3L3 21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

function ShortPlayerCard({
  item,
  isActive,
  topInset,
  bottomInset,
}: ShortPlayerCardProps) {
  const videoRef = useRef<ExpoVideo>(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(Platform.OS === "web");
  const [isPlayingLocal, setIsPlayingLocal] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (item.source.origin === "external") return;

    const player = videoRef.current;
    if (!player) return;

    if (isActive && !hasError) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("ShortPlayerCard: attempting play", {
          id: item.video.id,
          title: item.video.title,
          source: item.source,
          isActive,
          hasError,
        });
      }

      // Try to play; on web autoplay with sound is often blocked so
      // we may see a rejection here. Log it for debugging.
      player
        .playAsync()
        .then(() => {
          setIsPlayingLocal(true);
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("ShortPlayerCard: playAsync succeeded", item.video.id);
          }
        })
        .catch((error) => {
          // Playback failed (commonly due to autoplay policies on web)
          // Keep the error in console for easier debugging.
          // eslint-disable-next-line no-console
          console.warn("Video playAsync failed:", error);
        });
    } else {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("ShortPlayerCard: pausing", {
          id: item.video.id,
          isActive,
        });
      }

      player
        .pauseAsync()
        .then(() => setIsPlayingLocal(false))
        .catch(() => {
          /* no-op */
        });
    }
  }, [isActive, hasError, item.source]);

  const handleStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (__DEV__) {
      // Log a smaller, useful subset to avoid flooding the console.
      // Cast to any for logging to avoid TS issues with the union type.
      const s = status as any;
      // eslint-disable-next-line no-console
      console.log("playback status", {
        id: item.video.id,
        isLoaded: s.isLoaded,
        isPlaying: s.isPlaying,
        isBuffering: s.isBuffering,
        positionMillis: s.positionMillis,
        durationMillis: s.durationMillis ?? null,
        error: s.error ?? null,
      });
    }

    if (!status.isLoaded) {
      setHasError("Unable to load video");
      return;
    }

    const s = status as any;
    setIsBuffering(s.isBuffering ?? false);
    setIsPlayingLocal(Boolean(s.isPlaying));

    if (s.durationMillis && s.positionMillis) {
      const pct = (s.positionMillis / s.durationMillis) * 100;
      setProgress(Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0);
    } else {
      setProgress(0);
    }
  }, []);

  const handleError = useCallback((error: unknown) => {
    // expo-av may provide an object; log it to make debugging easier
    // eslint-disable-next-line no-console
    console.warn("Video onError", error);
    setHasError("Playback error");
  }, []);

  const togglePlayPause = useCallback(() => {
    const player = videoRef.current;
    if (!player) return;

    // If currently playing, pause; otherwise play.
    if (isPlayingLocal) {
      void player.pauseAsync().then(() => setIsPlayingLocal(false));
    } else {
      void player.playAsync().then(() => setIsPlayingLocal(true));
    }
  }, [isPlayingLocal]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    const player = videoRef.current;
    if (!player) return;
    try {
      // expo-av exposes setIsMutedAsync on the playback object
      // but the ref here is the component; use setStatusAsync as fallback
      void (player as any).setIsMutedAsync?.(next);
      void (player as any).setStatusAsync?.({ volume: next ? 0 : 1 });
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn("toggleMute failed", e);
      }
    }
  }, [isMuted]);

  const router = useRouter();

  const handleExternalVideoPress = useCallback(() => {
    if (item.source.origin === "external") {
      Linking.openURL(item.source.watchUrl).catch((err) => {
        // Failed to open external URL
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
        <Pressable
          style={{ flex: 1 }}
          onPress={togglePlayPause}
          android_ripple={{ color: "rgba(255,255,255,0.02)" }}
        >
          <ExpoVideo
            ref={videoRef}
            style={{ flex: 1 }}
            source={{ uri: item.source.uri }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive && !hasError}
            isLooping
            // Autoplay on web is frequently blocked unless the video is muted.
            // Mute playback when running on web to allow autoplay.
            volume={isMuted ? 0 : 1}
            isMuted={isMuted}
            posterSource={{ uri: item.video.imageUrl }}
            posterStyle={{ resizeMode: "cover" }}
            usePoster
            onPlaybackStatusUpdate={handleStatusUpdate}
            onError={handleError}
            onLoadStart={() => {
              if (__DEV__) {
                // eslint-disable-next-line no-console
                console.log("ExpoVideo onLoadStart", { id: item.video.id });
              }
              setIsBuffering(true);
            }}
            onLoad={() => {
              if (__DEV__) {
                // eslint-disable-next-line no-console
                console.log("ExpoVideo onLoad", { id: item.video.id });
              }
              setIsBuffering(false);
            }}
          />
        </Pressable>
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
              <VideoIcon size={36} color="#fff" />
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

      {/* Right-side action buttons (like TikTok style) */}
      <View
        style={{
          position: "absolute",
          right: 12,
          bottom: bottomInset + 120,
          alignItems: "center",
        }}
      >
        <Pressable
          style={{ alignItems: "center", marginBottom: 18 }}
          onPress={() => {
            // placeholder like action
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log("like press", item.video.id);
            }
          }}
        >
          <HeartIcon size={34} color="#ff2d55" />
          <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>
            1.2K
          </Text>
        </Pressable>

        <Pressable
          style={{ alignItems: "center", marginBottom: 18 }}
          onPress={() => {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log("comment press", item.video.id);
            }
          }}
        >
          <CommentIcon size={30} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>345</Text>
        </Pressable>

        <Pressable
          style={{ alignItems: "center", marginBottom: 18 }}
          onPress={() => {
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log("share press", item.video.id, item.source);
            }
          }}
        >
          <ShareIcon size={28} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>
            Share
          </Text>
        </Pressable>

        {/* Mute/unmute */}
        <Pressable
          style={{ alignItems: "center", marginBottom: 6 }}
          onPress={toggleMute}
        >
          {isMuted ? (
            <VolumeOffIcon size={26} color="#fff" />
          ) : (
            <VolumeIcon size={26} color="#fff" />
          )}
          <Text style={{ color: "#fff", fontSize: 11, marginTop: 6 }}>
            {isMuted ? "Muted" : "Sound"}
          </Text>
        </Pressable>
      </View>

      {/* Playback progress bar */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: bottomInset + 12,
          height: 4,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      >
        <View
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: "#ff0055",
          }}
        />
      </View>
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

  // Lower threshold to make activation a bit more permissive for shorter screens,
  // and add logging to help trace active index changes during debugging.
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      // eslint-disable-next-line no-console
      console.log("viewableItems changed", viewableItems);

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

        if (__DEV__) {
          const candidates = collectMediaCandidates(video);
          // eslint-disable-next-line no-console
          console.log(
            `hydrateShorts: resolving video id=${video.id} title=${video.title}`,
            { candidates, raw: video.raw }
          );
        }

        const { media, short } = resolveShortMedia(video);

        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log(`hydrateShorts: resolved media for ${video.id}`, {
            media,
            short,
          });
        }

        if (short.kind === "video") {
          playable.push({
            video,
            source: { uri: short.uri, origin: "direct" },
          });
        } else if (short.kind === "external") {
          playable.push({
            video,
            source: {
              uri: null,
              watchUrl: short.watchUrl,
              videoId: short.videoId,
              origin: "external",
            },
          });
        } else {
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

        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log(
            `loadShorts: fetched ${videos.length} videos`,
            videos.slice(0, 5)
          );
        }
        const { playable, unsupported } = await hydrateShorts(
          videos,
          controller.signal
        );

        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log(
            `loadShorts: playable=${playable.length} unsupported=${unsupported}`
          );
        }

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
      <View style={{ height: Dimensions.get("window").height, width: "100%" }}>
        <ShortPlayerCard
          item={item}
          isActive={isFocused && index === activeIndex}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      </View>
    ),
    [activeIndex, insets.bottom, insets.top, isFocused]
  );

  const windowHeight = Dimensions.get("window").height;

  // Dev-only: report activeIndex changes and the resolved source for easier debugging.
  useEffect(() => {
    if (!__DEV__) return;
    const active = shorts[activeIndex];
    const src = active?.source
      ? active.source.origin === "direct"
        ? active.source.uri
        : active.source.watchUrl
      : "(none)";
    // eslint-disable-next-line no-console
    console.log(`shorts: activeIndex=${activeIndex} activeSource=${src}`);
  }, [activeIndex, shorts]);

  const activeSourceUri = shorts[activeIndex]?.source
    ? shorts[activeIndex].source.origin === "direct"
      ? shorts[activeIndex].source.uri
      : shorts[activeIndex].source.watchUrl
    : undefined;

  if (loading && !shorts.length) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (error && !shorts.length) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          {error}
        </Text>
        <Text
          onPress={handleRefresh}
          style={{
            color: "#fff",
            fontSize: 16,
            textDecorationLine: "underline",
          }}
        >
          Try again
        </Text>
      </View>
    );
  }

  if (!shorts.length) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 20 }}>No shorts available</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {__DEV__ && (
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.6)",
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
            #{activeIndex}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 11,
              marginTop: 6,
              maxWidth: 220,
            }}
            numberOfLines={3}
          >
            {activeSourceUri ?? "(no source)"}
          </Text>
        </View>
      )}
      <FlatList
        data={shorts}
        renderItem={renderItem}
        keyExtractor={(_, idx) => String(idx)}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(_, index) => ({
          length: windowHeight,
          offset: windowHeight * index,
          index,
        })}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
      />
    </View>
  );
}
