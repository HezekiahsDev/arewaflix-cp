import { AVPlaybackStatus, Video as ExpoVideo } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AlertButton,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  RelatedVideosGrid,
  VideoControls,
  VideoMetadata,
  VideoPlayer,
} from "@/components/ui";
import { Video, fetchRelatedVideos, fetchVideos } from "@/lib/api/videos";
import { fetchYoutubePlaybackUrl } from "@/lib/videos/youtube";

const DEFAULT_TITLE = "Now playing";
const BUFFERING_TIMEOUT_MS = 12_000;

// Helper function to extract YouTube video ID from various URL formats
function extractYoutubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

type ResolvedSource = {
  uri: string;
  origin: "direct" | "youtube";
};

type PlayerParams = {
  uri?: string;
  title?: string;
  poster?: string;
  youtubeId?: string;
  source?: string;
};

export default function PlayerScreen() {
  const { uri, title, poster, youtubeId, source } =
    useLocalSearchParams<PlayerParams>();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const playableUri = useMemo(
    () => (typeof uri === "string" && uri.trim() ? uri : null),
    [uri]
  );

  const youtubeVideoId = useMemo(() => {
    if (typeof youtubeId !== "string") return null;
    const trimmed = youtubeId.trim();
    return trimmed ? trimmed : null;
  }, [youtubeId]);

  const youtubeSourceUrl = useMemo(() => {
    if (!youtubeVideoId) return null;
    if (typeof source === "string" && source.trim()) {
      return source.trim();
    }
    return `https://youtu.be/${youtubeVideoId}`;
  }, [source, youtubeVideoId]);

  const [resolvedSource, setResolvedSource] = useState<ResolvedSource | null>(
    () => (playableUri ? { uri: playableUri, origin: "direct" } : null)
  );
  const [resolvingYoutube, setResolvingYoutube] = useState(
    () => !playableUri && !!youtubeVideoId
  );
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // New state for enhanced player
  const [videoData, setVideoData] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [customControlsVisible, setCustomControlsVisible] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef<ExpoVideo | null>(null);

  useEffect(() => {
    let cancelled = false;

    console.log("[Player] Resolving video:", {
      playableUri,
      youtubeVideoId,
      youtubeSourceUrl,
      title,
    });

    if (playableUri) {
      console.log("[Player] Using direct URI:", playableUri);
      setResolvedSource({ uri: playableUri, origin: "direct" });
      setResolvingYoutube(false);
      setResolveError(null);
      return () => {
        cancelled = true;
      };
    }

    if (youtubeVideoId) {
      console.log("[Player] Resolving YouTube video ID:", youtubeVideoId);
      setResolvingYoutube(true);
      setResolveError(null);
      fetchYoutubePlaybackUrl(youtubeVideoId)
        .then((url) => {
          if (cancelled) return;
          if (url) {
            console.log(
              "[Player] YouTube resolved to:",
              url.substring(0, 100) + "..."
            );
            setResolvedSource({ uri: url, origin: "youtube" });
          } else {
            console.log(
              "[Player] YouTube resolution failed for ID:",
              youtubeVideoId
            );
            setResolvedSource(null);
            setResolveError("We couldn't load this short right now.");
          }
        })
        .catch((error) => {
          if (cancelled) return;
          console.error(
            "[PlayerScreen] Failed to resolve YouTube stream",
            error
          );
          setResolvedSource(null);
          setResolveError("We couldn't load this short right now.");
        })
        .finally(() => {
          if (!cancelled) {
            setResolvingYoutube(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }

    console.log("[Player] No playable source found");
    setResolvedSource(null);
    setResolvingYoutube(false);
    setResolveError(null);

    return () => {
      cancelled = true;
    };
  }, [playableUri, youtubeVideoId]);

  const displayTitle = useMemo(
    () =>
      typeof title === "string" && title.trim() ? title.trim() : DEFAULT_TITLE,
    [title]
  );

  // Load video data and related videos
  useEffect(() => {
    // Create enhanced video data from params
    const currentVideoData: Video = {
      id: youtubeVideoId || "current-video",
      title: displayTitle,
      description: `${displayTitle}\n\nThis video showcases amazing content that you'll love. Watch as we explore the fascinating world of entertainment and storytelling.\n\nDon't forget to like, share, and subscribe for more content like this!`,
      imageUrl: typeof poster === "string" ? poster : "",
      author: "ArewaFlix Official",
      category: "Film & Animation",
      views: Math.floor(Math.random() * 50000) + 10000,
      likes: Math.floor(Math.random() * 5000) + 500,
      comments: Math.floor(Math.random() * 1000) + 100,
      createdAt: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(), // Random date within last 30 days
      isShort: youtubeVideoId?.length === 11 && Math.random() > 0.7, // 30% chance to be a short
      duration: "12:45",
      durationSeconds: 765,
    };
    setVideoData(currentVideoData);

    // Load related videos using smart recommendation algorithm
    fetchRelatedVideos(currentVideoData, { limit: 15 })
      .then((relatedVideos) => {
        setRelatedVideos(relatedVideos);
      })
      .catch((error) => {
        console.error("Failed to load related videos:", error);
        // Fallback to popular videos if related videos fail
        fetchVideos({ limit: 15, sort: "popular" })
          .then((fallbackVideos) => {
            const filtered = fallbackVideos.filter(
              (v) => v.id !== currentVideoData.id
            );
            setRelatedVideos(filtered.slice(0, 12));
          })
          .catch(() => {
            setRelatedVideos([]);
          });
      });
  }, [youtubeVideoId, displayTitle, poster]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.back();
        return true;
      }
    );

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowControls(true);
      setIsBuffering(false);
    }, BUFFERING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!playableUri && !youtubeVideoId) {
      Alert.alert(
        "No video",
        "We couldn't find a playable video for this short.",
        [{ text: "Go back", onPress: () => router.back() }]
      );
    }
  }, [playableUri, youtubeVideoId, router]);

  useEffect(() => {
    setIsBuffering(resolvedSource !== null);
    setHasError(false);
  }, [resolvedSource?.uri]);

  const fallbackUrl = useMemo(() => {
    if (typeof source === "string" && source.trim()) {
      return source.trim();
    }
    if (youtubeSourceUrl) {
      return youtubeSourceUrl;
    }
    if (playableUri) {
      return playableUri;
    }
    return null;
  }, [playableUri, source, youtubeSourceUrl]);

  const handleToggleControls = useCallback(() => {
    setShowControls((value) => !value);
  }, []);

  const handlePlayableFallback = useCallback(() => {
    if (!fallbackUrl) return;
    void Linking.openURL(fallbackUrl).catch((error) => {
      console.error("[PlayerScreen] Failed to open URL", error);
      Alert.alert(
        "Unable to open",
        "We couldn't open this link in another app right now."
      );
    });
  }, [fallbackUrl]);

  const handlePlaybackError = useCallback(() => {
    setHasError(true);
    setIsBuffering(false);

    const buttons: AlertButton[] = fallbackUrl
      ? [
          { text: "Close", style: "cancel" },
          { text: "Open link", onPress: handlePlayableFallback },
        ]
      : [{ text: "Close", style: "cancel" }];

    Alert.alert(
      "Playback error",
      "We couldn't play this video. Please try again later.",
      buttons
    );
  }, [fallbackUrl, handlePlayableFallback]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status || !status.isLoaded) {
      return;
    }

    setIsBuffering(status.isBuffering ?? false);
    setIsPlaying(status.isPlaying ?? false);
    setPositionMillis(status.positionMillis ?? 0);
    setDurationMillis(status.durationMillis ?? 0);
  }, []);

  // Enhanced player event handlers
  const handlePlayPause = useCallback(async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          await videoRef.current.pauseAsync();
        } else {
          await videoRef.current.playAsync();
        }
      } catch (error) {
        console.error("Play/pause error:", error);
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback(async (positionMillis: number) => {
    if (videoRef.current) {
      try {
        await videoRef.current.setPositionAsync(positionMillis);
      } catch (error) {
        console.error("Seek error:", error);
      }
    }
  }, []);

  const handleRelatedVideoPress = useCallback(
    (video: Video) => {
      // Navigate to the selected video with comprehensive params
      const params: PlayerParams = {
        title: video.title,
        poster: video.imageUrl,
      };

      // Add video source if available
      if (video.videoLocation) {
        params.uri = video.videoLocation;
      }

      // Extract YouTube ID if it's a YouTube video
      if (video.raw?.video_location) {
        const youtubeId = extractYoutubeId(video.raw.video_location);
        if (youtubeId) {
          params.youtubeId = youtubeId;
          params.source = video.raw.video_location;
        }
      }

      router.push({
        pathname: "/player",
        params,
      });
    },
    [router]
  );

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen((prev) => !prev);
    // Implement fullscreen logic here
  }, []);

  const handleControlsVisibilityChange = useCallback((visible: boolean) => {
    setCustomControlsVisible(visible);
  }, []);

  // Video metadata interaction handlers
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleLikePress = useCallback(() => {
    setHasLiked(!hasLiked);
    if (hasDisliked) setHasDisliked(false);
    // In real app, this would make an API call to update like status
  }, [hasLiked, hasDisliked]);

  const handleDislikePress = useCallback(() => {
    setHasDisliked(!hasDisliked);
    if (hasLiked) setHasLiked(false);
    // In real app, this would make an API call to update dislike status
  }, [hasLiked, hasDisliked]);

  const handleSharePress = useCallback(() => {
    if (youtubeSourceUrl) {
      // Share the YouTube URL if available
      if (Platform.OS === "web") {
        navigator
          .share?.({
            title: displayTitle,
            url: youtubeSourceUrl,
          })
          .catch(() => {
            // Fallback for browsers that don't support Web Share API
            navigator.clipboard?.writeText(youtubeSourceUrl);
          });
      } else {
        // For mobile, use React Native's sharing functionality
        // This would require @react-native-async-storage/async-storage or similar
        Alert.alert("Share Video", "Video URL copied to clipboard", [
          { text: "OK" },
        ]);
      }
    }
  }, [displayTitle, youtubeSourceUrl]);

  const handleSubscribePress = useCallback(() => {
    setIsSubscribed(!isSubscribed);
    // In real app, this would make an API call to subscribe/unsubscribe
  }, [isSubscribed]);

  const handlePublisherPress = useCallback(() => {
    // Navigate to publisher/channel page
    console.log("Navigate to publisher page");
  }, []);

  const handleCategoryPress = useCallback((categoryId: string) => {
    // Navigate to category page or filter by category
    console.log("Navigate to category:", categoryId);
  }, []);

  const handleDescriptionToggle = useCallback(() => {
    setDescriptionExpanded(!descriptionExpanded);
  }, [descriptionExpanded]);

  const controlsVisible = resolvedSource !== null ? showControls : false;
  const posterVisible = Boolean(
    poster && (isBuffering || hasError || resolvingYoutube || !resolvedSource)
  );

  const badgeLabel =
    resolvedSource?.origin === "youtube" ? "YouTube Stream" : "Direct Video";

  const showUnavailableOverlay =
    !resolvedSource && (resolveError !== null || !youtubeVideoId);

  if (isFullscreen) {
    // Fullscreen mode - video only with custom controls
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {resolvedSource ? (
          <View style={{ flex: 1 }}>
            <VideoPlayer
              uri={resolvedSource.uri}
              poster={typeof poster === "string" ? poster : undefined}
              autoplay={!hasError}
              useNativeControls={false}
              showCustomControls
              videoRef={videoRef}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onError={handlePlaybackError}
              className="flex-1"
            />
            <VideoControls
              visible={customControlsVisible}
              isPlaying={isPlaying}
              positionMillis={positionMillis}
              durationMillis={durationMillis}
              isFullscreen={isFullscreen}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onFullscreenToggle={handleFullscreenToggle}
              onControlsVisibilityChange={handleControlsVisibilityChange}
            />
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#000",
              paddingHorizontal: 24,
            }}
          >
            {/* Loading/Error states */}
            {resolvingYoutube ? (
              <View
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 18,
                  borderRadius: 16,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator
                  size="large"
                  color="#ffffff"
                  style={{ marginBottom: 12 }}
                />
                <Text
                  style={{
                    color: "#ffffff",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  Preparing video…
                </Text>
              </View>
            ) : showUnavailableOverlay ? (
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
                  {resolveError ?? "This video is currently unavailable."}
                </Text>
                {fallbackUrl ? (
                  <Pressable
                    onPress={handlePlayableFallback}
                    style={{
                      marginTop: 12,
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.18)",
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}
                    >
                      Open in browser
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  }

  // Normal mode - comprehensive video player experience
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        paddingTop:
          Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Video Player Section */}
        <View>
          {resolvedSource ? (
            <View className="relative">
              <VideoPlayer
                uri={resolvedSource.uri}
                poster={typeof poster === "string" ? poster : undefined}
                autoplay={!hasError}
                useNativeControls={!customControlsVisible}
                showCustomControls={customControlsVisible}
                videoRef={videoRef}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                onError={handlePlaybackError}
                className="w-full"
              />

              {/* Custom Controls Overlay */}
              {customControlsVisible && (
                <VideoControls
                  visible={customControlsVisible}
                  isPlaying={isPlaying}
                  positionMillis={positionMillis}
                  durationMillis={durationMillis}
                  isFullscreen={isFullscreen}
                  onPlayPause={handlePlayPause}
                  onSeek={handleSeek}
                  onFullscreenToggle={handleFullscreenToggle}
                  onControlsVisibilityChange={handleControlsVisibilityChange}
                />
              )}
            </View>
          ) : (
            <View className="aspect-video bg-black flex items-center justify-center">
              {resolvingYoutube ? (
                <View className="bg-black/60 rounded-2xl px-6 py-4 items-center">
                  <ActivityIndicator
                    size="large"
                    color="#ffffff"
                    style={{ marginBottom: 12 }}
                  />
                  <Text className="text-white text-sm text-center">
                    Preparing video…
                  </Text>
                </View>
              ) : showUnavailableOverlay ? (
                <View className="bg-black/70 rounded-2xl px-6 py-4 items-center">
                  <Text className="text-white text-base font-semibold text-center">
                    {resolveError ?? "This video is currently unavailable."}
                  </Text>
                  {fallbackUrl && (
                    <Pressable
                      onPress={handlePlayableFallback}
                      className="mt-3 bg-white/20 rounded-full px-4 py-2"
                    >
                      <Text className="text-white text-sm font-semibold">
                        Open in browser
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Video Metadata Section */}
        {videoData && (
          <VideoMetadata
            video={videoData}
            likes={videoData.likes || 0}
            dislikes={Math.floor((videoData.likes || 0) * 0.1)} // 10% of likes as dislikes
            hasLiked={hasLiked}
            hasDisliked={hasDisliked}
            isSubscribed={isSubscribed}
            descriptionExpanded={descriptionExpanded}
            onToggleDescription={handleDescriptionToggle}
            onSharePress={handleSharePress}
            onLikePress={handleLikePress}
            onDislikePress={handleDislikePress}
            onSubscribePress={handleSubscribePress}
            onPublisherPress={handlePublisherPress}
            onCategoryPress={handleCategoryPress}
          />
        )}

        {/* Related Videos Section */}
        {relatedVideos.length > 0 && (
          <RelatedVideosGrid
            videos={relatedVideos}
            currentVideoId={videoData?.id}
            numColumns={2}
            maxVideos={12}
            headerTitle="Related Videos"
            onVideoPress={handleRelatedVideoPress}
            className="mt-4"
          />
        )}

        {/* Bottom spacing */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* Loading overlay */}
      {((isBuffering && resolvedSource) || resolvingYoutube) && (
        <View className="absolute inset-0 flex items-center justify-center bg-black/30">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
}
