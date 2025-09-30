import { useIsFocused } from "@react-navigation/native";
import { AVPlaybackStatus, Video as ExpoVideo, ResizeMode } from "expo-av";
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
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  VIDEOS_API_BASE_URL,
  Video as VideoModel,
  fetchShorts,
  getVideosErrorMessage,
} from "@/lib/api/videos";
import { getDurationLabel } from "@/lib/videos/formatters";
import { fetchYoutubePlaybackUrl } from "@/lib/videos/youtube";

type ShortMedia =
  | { kind: "video"; uri: string }
  | { kind: "youtube"; videoId: string; url: string }
  | { kind: "none" };

type PlayableShort = {
  video: VideoModel;
  source: {
    uri: string;
    origin: "direct" | "youtube";
  };
};

const VIDEO_FILE_EXTENSIONS = [
  "mp4",
  "m4v",
  "mov",
  "webm",
  "mkv",
  "avi",
  "flv",
  "wmv",
  "m3u8",
  "ts",
  "m2ts",
];

const MEDIA_CANDIDATE_KEYS = [
  "video_location",
  "videoLocation",
  "video_url",
  "videoUrl",
  "videoFile",
  "video_file",
  "video",
  "source",
  "source_url",
  "sourceUrl",
  "stream_url",
  "streamUrl",
  "stream",
  "download_url",
  "downloadUrl",
  "embed",
  "embed_code",
  "embedCode",
  "iframe",
  "iframe_src",
  "iframeSrc",
  "youtube",
  "youtube_url",
  "youtubeUrl",
  "youtube_code",
  "youtubeCode",
  "youtube_id",
  "youtubeId",
  "video_id",
  "videoId",
  "youtube_link",
  "youtubeLink",
  "short_id",
  "shortId",
  "short_code",
  "shortCode",
  "code",
  "url",
];

const MEDIA_COLLECTION_KEYS = ["sources", "videos", "urls", "media", "embeds"];

function collectMediaCandidates(video: VideoModel): string[] {
  const seen = new Set<string>();

  const addCandidate = (value: unknown) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (!trimmed) return;
    seen.add(trimmed);
  };

  addCandidate(video.videoLocation);

  const raw = (video.raw ?? {}) as Record<string, unknown>;

  MEDIA_CANDIDATE_KEYS.forEach((key) => addCandidate(raw[key]));

  MEDIA_COLLECTION_KEYS.forEach((key) => {
    const value = raw[key];
    if (Array.isArray(value)) {
      value.forEach((entry) => addCandidate(entry));
    }
  });

  return Array.from(seen);
}

function isYoutubeValue(value: string): boolean {
  return /youtube\.com|youtu\.be/i.test(value);
}

function hasPathIndicators(value: string): boolean {
  return value.includes("/") || /\.[a-z0-9]{2,4}(\?|$)/i.test(value);
}

function resolveDirectVideoUrl(candidate: string): string | undefined {
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;

  if (isYoutubeValue(trimmed)) {
    return undefined;
  }

  const lower = trimmed.toLowerCase();
  const hasExtension = VIDEO_FILE_EXTENSIONS.some((ext) =>
    lower.includes(`.${ext}`)
  );

  const qualifiesAsPath = hasExtension || hasPathIndicators(trimmed);

  if (/^https?:\/{2}/i.test(trimmed)) {
    return qualifiesAsPath ? trimmed : undefined;
  }

  if (trimmed.startsWith("//")) {
    const normalized = `https:${trimmed}`;
    return qualifiesAsPath ? normalized : undefined;
  }

  if (!qualifiesAsPath) {
    return undefined;
  }

  const sanitized = trimmed.replace(/^\/+/, "");
  return `${VIDEOS_API_BASE_URL}/${sanitized}`;
}

function extractYoutubeId(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const iframeMatch = trimmed.match(
    /youtube\.com\/embed\/([A-Za-z0-9_-]{9,15})/i
  );
  if (iframeMatch) return iframeMatch[1];

  const shortsMatch = trimmed.match(
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{9,15})/i
  );
  if (shortsMatch) return shortsMatch[1];

  const watchParam = trimmed.match(/[?&]v=([A-Za-z0-9_-]{9,15})/i);
  if (watchParam) return watchParam[1];

  const youtuMatch = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{9,15})/i);
  if (youtuMatch) return youtuMatch[1];

  if (/^https?:\/\//i.test(trimmed) && isYoutubeValue(trimmed)) {
    const pathMatch = trimmed.match(/\/([A-Za-z0-9_-]{9,15})(?:\?|$)/);
    if (pathMatch) return pathMatch[1];
  }

  if (/^[A-Za-z0-9_-]{9,15}$/.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

function buildYoutubeUrl(candidate: string, videoId: string): string {
  // Always use youtu.be format for consistency
  return `https://youtu.be/${videoId}`;
}

function normalizeHttpUrl(candidate: string): string | undefined {
  const trimmed = candidate.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/{2}/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return `${VIDEOS_API_BASE_URL}${trimmed}`;
  }

  return undefined;
}

function resolveShortMedia(video: VideoModel): ShortMedia {
  const candidates = collectMediaCandidates(video);

  console.log(
    `[Shorts] Video ${video.id} (${video.title}) media candidates:`,
    candidates
  );
  console.log(
    `[Shorts] Video ${video.id} has videoLocation:`,
    video.videoLocation
  );

  for (const candidate of candidates) {
    const direct = resolveDirectVideoUrl(candidate);
    if (direct) {
      console.log(
        `[Shorts] Video ${video.id} resolved as direct video: ${direct}`
      );
      return { kind: "video", uri: direct };
    }
  }

  for (const candidate of candidates) {
    const youtubeId = extractYoutubeId(candidate);
    if (youtubeId) {
      console.log(
        `[Shorts] Video ${video.id} resolved as YouTube with ID: ${youtubeId} (from: ${candidate})`
      );
      return {
        kind: "youtube",
        videoId: youtubeId,
        url: `https://youtu.be/${youtubeId}`,
      };
    }
  }

  console.log(`[Shorts] Video ${video.id} has no playable media`);
  return { kind: "none" };
}

async function resolvePlayableSource(
  video: VideoModel,
  signal?: AbortSignal
): Promise<PlayableShort["source"] | null> {
  const media = resolveShortMedia(video);

  if (media.kind === "video") {
    return { uri: media.uri, origin: "direct" };
  }

  if (media.kind === "youtube") {
    const stream = await fetchYoutubePlaybackUrl(media.videoId, signal);
    if (stream) {
      return { uri: stream, origin: "youtube" };
    }
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
  }, [isActive, hasError, item.source.uri]);

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

  const durationLabel = useMemo(
    () => getDurationLabel(item.video),
    [item.video]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
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
            {item.source.origin === "youtube"
              ? "YouTube Stream"
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
        const source = await resolvePlayableSource(video, signal);
        if (signal?.aborted) break;
        if (source) {
          console.log(
            `[Shorts] ✓ Video ${video.id} resolved to ${source.origin}: ${source.uri.substring(0, 100)}...`
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
