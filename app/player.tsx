import { useAuth } from "@/context/AuthContext";
import {
  fetchUserReaction,
  fetchVideoComments,
  fetchVideoLikes,
  postVideoComment,
  postVideoReaction,
  trackVideoView,
  VideoComment,
} from "@/lib/api/video-interactions";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import {
  Audio,
  AVPlaybackStatus,
  AVPlaybackStatusSuccess,
  Video as ExpoVideo,
  InterruptionModeAndroid,
  InterruptionModeIOS,
  ResizeMode,
} from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const BASE_VIDEO_URL = "https://arewaflix.s3.us-east-005.backblazeb2.com/";
const API_BASE_URL = "https://api.arewaflix.io";
const API_HOSTNAMES = ["api.arewaflix.io", "arewaflix.io", "www.arewaflix.io"];

function ensureTrailingSlash(url: string) {
  return url.endsWith("/") ? url : `${url}/`;
}
const DEFAULT_TITLE = "Now playing";
const AUTO_HIDE_DELAY = 4000;

type PlayerParams = {
  uri?: string | string[];
  path?: string | string[];
  source?: string | string[];
  title?: string | string[];
  poster?: string | string[];
  videoId?: string | string[];
};

type BufferInfo = {
  active: boolean;
  label: string;
  percent: number;
  bufferedAheadMillis: number;
  playableMillis: number;
};

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((item) => typeof item === "string")?.trim();
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return undefined;
}

function isHttpUrl(value: string | undefined): boolean {
  return value ? /^https?:\/\//i.test(value) : false;
}

function rewriteToCdn(candidate: string): string {
  try {
    const url = new URL(candidate);
    const base = new URL(ensureTrailingSlash(BASE_VIDEO_URL));

    const host = url.hostname.toLowerCase();
    if (host === base.hostname.toLowerCase()) {
      return candidate;
    }

    if (API_HOSTNAMES.includes(host)) {
      const rewritten = new URL(url.pathname, base);
      rewritten.search = url.search;
      rewritten.hash = url.hash;
      const rewrittenString = rewritten.toString();
      return rewrittenString;
    }
  } catch (error) {
    // not an absolute URL; handled elsewhere
  }

  return candidate;
}

function resolveCdnUri(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (isHttpUrl(trimmed)) {
    return rewriteToCdn(trimmed);
  }

  const base = ensureTrailingSlash(BASE_VIDEO_URL);
  const sanitized = trimmed.replace(/^\/+/, "");
  return `${base}${encodeURI(sanitized)}`;
}

function buildVideoUri(primary?: string, fallback?: string) {
  const candidateOrder = [primary, fallback];
  for (const candidate of candidateOrder) {
    const resolved = resolveCdnUri(candidate);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
}

function isPlaybackStatusSuccess(
  status: AVPlaybackStatus | null
): status is AVPlaybackStatusSuccess {
  return Boolean(status && "isLoaded" in status && status.isLoaded);
}

function formatTime(millis: number): string {
  if (!Number.isFinite(millis) || millis < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(1, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/**
 * Resolve avatar URL using CDN or API base URL
 * Similar to video thumbnail resolution
 */
function resolveAvatarUri(avatar?: string): string | undefined {
  if (!avatar) {
    return undefined;
  }

  const trimmed = avatar.trim();
  if (!trimmed) {
    return undefined;
  }

  // If already an absolute URL, return as-is
  if (isHttpUrl(trimmed)) {
    console.log("[AvatarResolution] Using absolute URL:", trimmed);
    return trimmed;
  }

  // Try CDN first (avatars might be on CDN)
  const cdnBase = ensureTrailingSlash(BASE_VIDEO_URL);
  const sanitized = trimmed.replace(/^\/+/, "");

  // Check if this looks like a CDN path (contains "upload/photos")
  if (sanitized.includes("upload/photos")) {
    const resolvedUrl = `${cdnBase}${encodeURI(sanitized)}`;
    console.log("[AvatarResolution] Resolved to CDN:", {
      original: avatar,
      resolved: resolvedUrl,
    });
    return resolvedUrl;
  }

  // Fallback to API base URL for other paths
  const resolvedUrl = `${API_BASE_URL}/${sanitized}`;
  console.log("[AvatarResolution] Resolved to API base:", {
    original: avatar,
    resolved: resolvedUrl,
  });
  return resolvedUrl;
}

export default function PlayerScreen() {
  const params = useLocalSearchParams<PlayerParams>();
  const router = useRouter();

  const providedUri = firstString(params.uri);
  const providedPath = firstString(params.path);
  const source = firstString(params.source);
  const poster = firstString(params.poster);
  const title = firstString(params.title);
  const videoId = firstString(params.videoId);

  const resolvedUri = useMemo(
    () => buildVideoUri(providedUri ?? providedPath, source),
    [providedUri, providedPath, source]
  );

  useEffect(() => {
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        });
      } catch (error) {
        // Failed to configure audio mode
      }
    })();
  }, []);

  useEffect(() => {
    // Route params logged for debugging
  }, [providedPath, providedUri, poster, source, title]);

  useEffect(() => {
    // Resolved URI effect for debugging
  }, [resolvedUri]);

  const displayTitle = useMemo(() => {
    if (title) {
      return title;
    }
    const filename = providedPath ?? providedUri;
    if (filename) {
      const parts = filename.split("/");
      return parts[parts.length - 1] || DEFAULT_TITLE;
    }
    return DEFAULT_TITLE;
  }, [title, providedPath, providedUri]);

  const videoRef = useRef<ExpoVideo | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [playbackStatus, setPlaybackStatus] = useState<AVPlaybackStatus | null>(
    null
  );
  const [controlsVisible, setControlsVisible] = useState(true);
  const [bufferInfo, setBufferInfo] = useState<BufferInfo>({
    active: true,
    label: "Loading video...",
    percent: 0,
    bufferedAheadMillis: 0,
    playableMillis: 0,
  });

  const successStatus = isPlaybackStatusSuccess(playbackStatus)
    ? playbackStatus
    : null;
  const isLoaded = Boolean(successStatus);
  const isPlaying = successStatus?.isPlaying ?? false;
  const isBuffering = bufferInfo.active;
  const positionMillis = successStatus?.positionMillis ?? 0;
  const durationMillis = successStatus?.durationMillis ?? 0;
  const hasFinished = successStatus?.didJustFinish ?? false;

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  // Pagination state for comments
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const [isPostingReaction, setIsPostingReaction] = useState(false);

  // Error states
  const [videoError, setVideoError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [likesError, setLikesError] = useState<string | null>(null);

  const COMMENTS_PAGE_LIMIT = 20;

  const { user, token } = useAuth();

  const progressValue = isSeeking ? seekPosition : positionMillis;

  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideControlsTimeout();
    hideControlsTimeout.current = setTimeout(() => {
      setControlsVisible(false);
    }, AUTO_HIDE_DELAY);
  }, [clearHideControlsTimeout]);

  const refreshControlsAutoHide = useCallback(() => {
    scheduleHideControls();
  }, [scheduleHideControls]);

  const showControls = useCallback(() => {
    setControlsVisible((prev) => (prev ? prev : true));
    refreshControlsAutoHide();
  }, [refreshControlsAutoHide]);

  const hideControls = useCallback(() => {
    setControlsVisible(false);
    clearHideControlsTimeout();
  }, [clearHideControlsTimeout]);

  const registerInteraction = useCallback(() => {
    refreshControlsAutoHide();
    setControlsVisible(true);
  }, [refreshControlsAutoHide]);

  const handleShowControls = useCallback(() => {
    showControls();
  }, [showControls]);

  const handleHideControls = useCallback(() => {
    hideControls();
  }, [hideControls]);

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: controlsVisible ? 200 : 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [controlsOpacity, controlsVisible]);

  useEffect(() => {
    refreshControlsAutoHide();
    return () => {
      clearHideControlsTimeout();
    };
  }, [clearHideControlsTimeout, refreshControlsAutoHide]);

  useEffect(() => {
    if (!isSeeking) {
      setSeekPosition(positionMillis);
    }
  }, [isSeeking, positionMillis]);

  // Show controls when video finishes
  useEffect(() => {
    if (hasFinished) {
      setControlsVisible(true);
      clearHideControlsTimeout();
    }
  }, [hasFinished, clearHideControlsTimeout]);

  // Load comments, likes, and user reaction when videoId is available (page 1)
  useEffect(() => {
    if (!videoId) return;

    const controller = new AbortController();

    (async () => {
      setIsLoadingComments(true);
      setIsLoadingLikes(true);
      setCommentsError(null);
      setLikesError(null);

      try {
        // Fetch comments and likes (always)
        const [commentsResponse, likesResponse] = await Promise.allSettled([
          fetchVideoComments(videoId, {
            page: 1,
            limit: COMMENTS_PAGE_LIMIT,
            signal: controller.signal,
          }),
          fetchVideoLikes(videoId, controller.signal),
        ]);

        // Handle comments
        if (commentsResponse.status === "fulfilled") {
          setComments(commentsResponse.value.data);
          setCommentsPage(commentsResponse.value.pagination?.page ?? 1);
          setCommentsTotalPages(
            commentsResponse.value.pagination?.totalPages ?? 1
          );
        } else {
          if ((commentsResponse.reason as Error).name !== "AbortError") {
            setCommentsError(
              "Failed to load comments. Please try again later."
            );
          }
        }

        // Handle likes
        if (likesResponse.status === "fulfilled") {
          setLikes(likesResponse.value.data.likes);
        } else {
          if ((likesResponse.reason as Error).name !== "AbortError") {
            setLikesError("Failed to load likes.");
          }
        }

        // Fetch user reaction separately (only if authenticated)
        if (token) {
          try {
            const reactionData = await fetchUserReaction(
              videoId,
              token,
              controller.signal
            );
            const reaction = reactionData.data.reaction;
            setIsLiked(reaction === 1);
            setIsDisliked(reaction === 2);
          } catch (error) {
            if ((error as Error).name !== "AbortError") {
              // Not showing error to user as this is not critical
            }
          }
        }
      } catch (error) {
        // Unexpected error in loading comments/likes
      } finally {
        setIsLoadingComments(false);
        setIsLoadingLikes(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [videoId, token]);

  // Track view when video loads and starts playing
  useEffect(() => {
    if (!videoId || !isLoaded || !isPlaying) return;

    let hasTracked = false;

    (async () => {
      if (hasTracked) return;
      hasTracked = true;

      try {
        // Get persistent device fingerprint to prevent Sybil attacks
        const fingerprint = await getDeviceFingerprint();
        const response = await trackVideoView(videoId, {
          fingerprint,
          userId: user?.id,
        });
      } catch (error) {
        // Failed to track view
      }
    })();
  }, [videoId, isLoaded, isPlaying, user]);

  const handleStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      setPlaybackStatus(status);

      if (isPlaybackStatusSuccess(status)) {
        const duration = status.durationMillis ?? 0;
        const playableMillis = status.playableDurationMillis ?? 0;
        const bufferedAheadMillis = Math.max(
          0,
          playableMillis - status.positionMillis
        );
        const percentBuffered =
          duration > 0 ? Math.min(playableMillis / duration, 1) : 0;

        const isInitialLoading =
          status.positionMillis < 1500 && percentBuffered < 0.2;
        const waitingForData =
          status.shouldPlay && !status.isPlaying && status.isBuffering;
        const shouldShowBufferOverlay =
          (status.isBuffering || waitingForData) && !status.didJustFinish;

        let bufferLabel = "";
        let bufferActive = false;

        if (shouldShowBufferOverlay) {
          bufferActive = true;
          if (isInitialLoading) {
            bufferLabel = "Loading video...";
          } else if (waitingForData) {
            bufferLabel =
              bufferedAheadMillis < 2_000
                ? "Reconnecting to the stream..."
                : "Buffering...";
          } else if (status.isBuffering) {
            bufferLabel = "Buffering...";
          } else {
            bufferLabel = "Loading video...";
          }
        }

        setBufferInfo({
          active: bufferActive,
          label: bufferLabel,
          percent: percentBuffered,
          bufferedAheadMillis,
          playableMillis,
        });
      } else {
        setBufferInfo({
          active: true,
          label: status.error
            ? "Playback error — retrying..."
            : "Connecting to video...",
          percent: 0,
          bufferedAheadMillis: 0,
          playableMillis: 0,
        });
      }
    },
    [setBufferInfo]
  );

  const handleLoadStart = useCallback(() => {
    setBufferInfo((prev) => ({
      ...prev,
      active: true,
      label: "Loading video...",
      percent: 0,
      bufferedAheadMillis: 0,
      playableMillis: 0,
    }));
  }, [setBufferInfo]);

  const handleLoad = useCallback(
    (status: AVPlaybackStatus) => {
      if (isPlaybackStatusSuccess(status)) {
        setBufferInfo((prev) => ({
          ...prev,
          label: prev.active ? "Preparing playback..." : prev.label,
          playableMillis: status.playableDurationMillis ?? prev.playableMillis,
        }));
        const video = videoRef.current;
        if (video) {
          video.setIsMutedAsync(false).catch(() => {
            // Failed to unmute after load
          });
          video.setVolumeAsync(1).catch(() => {
            // Failed to set volume after load
          });
        }
      } else {
      }
    },
    [setBufferInfo]
  );

  const handleError = useCallback(
    (error: string) => {
      setVideoError(
        "Unable to play this video. Please check your connection and try again."
      );
      setBufferInfo({
        active: false,
        label: "",
        percent: 0,
        bufferedAheadMillis: 0,
        playableMillis: 0,
      });
    },
    [setBufferInfo]
  );

  const handleSeek = useCallback(
    async (deltaMillis: number) => {
      const video = videoRef.current;
      if (!video || !isLoaded) {
        return;
      }

      registerInteraction();

      const current = successStatus?.positionMillis ?? 0;
      const duration = successStatus?.durationMillis ?? durationMillis;
      const target = Math.min(
        Math.max(current + deltaMillis, 0),
        duration > 0 ? duration : current + deltaMillis
      );

      try {
        await video.setPositionAsync(target);
      } catch (error) {
        // Failed to seek
      }
    },
    [durationMillis, isLoaded, registerInteraction, successStatus]
  );

  const handleSeekTo = useCallback(
    async (millis: number) => {
      const video = videoRef.current;
      if (!video || !isLoaded) {
        return;
      }

      registerInteraction();

      const duration = successStatus?.durationMillis ?? durationMillis;
      const clamped = Math.min(
        Math.max(millis, 0),
        duration > 0 ? duration : millis
      );

      try {
        await video.setPositionAsync(clamped);
      } catch (error) {
        // Failed to seek to position
      }
    },
    [durationMillis, isLoaded, registerInteraction, successStatus]
  );

  const handleLikePress = useCallback(async () => {
    if (!videoId || !token || isPostingReaction) {
      return;
    }

    setIsPostingReaction(true);
    setLikesError(null);
    try {
      const response = await postVideoReaction(videoId, "like", token);
      setLikes(response.data.likes);
      setDislikes(response.data.dislikes);
      setIsLiked((prev) => !prev);
      if (isDisliked) {
        setIsDisliked(false);
      }
    } catch (error) {
      setLikesError("Failed to update reaction. Please try again.");
    } finally {
      setIsPostingReaction(false);
    }
  }, [videoId, token, isPostingReaction, isDisliked]);

  const handleDislikePress = useCallback(async () => {
    if (!videoId || !token || isPostingReaction) {
      return;
    }

    setIsPostingReaction(true);
    setLikesError(null);
    try {
      const response = await postVideoReaction(videoId, "dislike", token);
      setLikes(response.data.likes);
      setDislikes(response.data.dislikes);
      setIsDisliked((prev) => !prev);
      if (isLiked) {
        setIsLiked(false);
      }
    } catch (error) {
      setLikesError("Failed to update reaction. Please try again.");
    } finally {
      setIsPostingReaction(false);
    }
  }, [videoId, token, isPostingReaction, isLiked]);

  const handleSubmitComment = useCallback(async () => {
    const trimmed = commentDraft.trim();
    if (!trimmed.length || !videoId || !token) {
      return;
    }

    // Dismiss keyboard before posting
    Keyboard.dismiss();

    setIsPostingComment(true);
    setCommentsError(null);
    try {
      await postVideoComment(videoId, trimmed, token);
      setCommentDraft("");

      // Refetch comments (page 1) after posting and reset pagination
      const commentsResponse = await fetchVideoComments(videoId, {
        page: 1,
        limit: COMMENTS_PAGE_LIMIT,
      });
      setComments(commentsResponse.data);
      setCommentsPage(commentsResponse.pagination?.page ?? 1);
      setCommentsTotalPages(commentsResponse.pagination?.totalPages ?? 1);
    } catch (error) {
      setCommentsError("Failed to post comment. Please try again.");
      // Don't clear the draft on error so user can retry
    } finally {
      setIsPostingComment(false);
    }
  }, [commentDraft, videoId, token]);

  const loadMoreComments = useCallback(async () => {
    if (!videoId) return;
    if (isLoadingMoreComments) return;
    if (commentsPage >= commentsTotalPages) return;

    setIsLoadingMoreComments(true);
    try {
      const nextPage = commentsPage + 1;
      const resp = await fetchVideoComments(videoId, {
        page: nextPage,
        limit: COMMENTS_PAGE_LIMIT,
      });
      setComments((prev) => [...prev, ...(resp.data || [])]);
      setCommentsPage(resp.pagination?.page ?? nextPage);
      setCommentsTotalPages(resp.pagination?.totalPages ?? commentsTotalPages);
    } catch (error) {
      setCommentsError("Failed to load more comments.");
    } finally {
      setIsLoadingMoreComments(false);
    }
  }, [commentsPage, commentsTotalPages, isLoadingMoreComments, videoId]);

  const handleTogglePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isLoaded) {
      return;
    }
    registerInteraction();
    try {
      if (isPlaying) {
        await video.pauseAsync();
      } else {
        await video.playAsync();
      }
    } catch (error) {
      // Failed to toggle playback
    }
  }, [isLoaded, isPlaying, registerInteraction]);

  const handleEnterFullscreen = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isLoaded) {
      return;
    }
    registerInteraction();
    try {
      await video.presentFullscreenPlayer();
    } catch (error) {
      // Failed to enter fullscreen
    }
  }, [isLoaded, registerInteraction]);

  const handleReplay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isLoaded) {
      return;
    }
    registerInteraction();
    try {
      await video.setPositionAsync(0);
      await video.playAsync();
    } catch (error) {
      // Failed to replay video
    }
  }, [isLoaded, registerInteraction]);

  const handleSlidingStart = useCallback(() => {
    if (!isLoaded) {
      return;
    }
    registerInteraction();
    setIsSeeking(true);
  }, [isLoaded, registerInteraction]);

  const handleSlidingComplete = useCallback(
    async (value: number) => {
      if (!isLoaded) {
        setIsSeeking(false);
        return;
      }

      registerInteraction();
      await handleSeekTo(value);
      setIsSeeking(false);
    },
    [handleSeekTo, isLoaded, registerInteraction]
  );

  const handleSliderValueChange = useCallback(
    (value: number) => {
      if (!isLoaded) {
        return;
      }
      registerInteraction();
      setSeekPosition(value);
    },
    [isLoaded, registerInteraction]
  );

  if (!resolvedUri) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.emptyTitle}>Video unavailable</Text>
        <Text style={styles.emptySubtitle}>
          We couldn&apos;t find a valid video source. Please try again later.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle={Platform.OS === "android" ? "light-content" : "default"}
        backgroundColor="#000"
      />

      <View style={styles.videoContainer}>
        <ExpoVideo
          ref={videoRef}
          style={styles.video}
          source={{ uri: resolvedUri }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          volume={1}
          isMuted={false}
          usePoster={Boolean(poster)}
          posterSource={poster ? { uri: poster } : undefined}
          onPlaybackStatusUpdate={handleStatusUpdate}
          onLoadStart={handleLoadStart}
          onLoad={handleLoad}
          onError={handleError}
        />

        {isBuffering ? (
          <View style={styles.bufferOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            {bufferInfo.label ? (
              <Text style={styles.bufferLabel}>{bufferInfo.label}</Text>
            ) : null}
            {bufferInfo.bufferedAheadMillis > 0 ? (
              <Text style={styles.bufferSublabel}>
                Ready for the next {formatTime(bufferInfo.bufferedAheadMillis)}
              </Text>
            ) : null}
            {bufferInfo.percent > 0 ? (
              <>
                <View style={styles.bufferProgressTrack}>
                  <View
                    style={[
                      styles.bufferProgressFill,
                      {
                        width: `${Math.min(100, Math.max(0, Math.round(bufferInfo.percent * 100)))}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.bufferPercentLabel}>
                  {Math.min(
                    100,
                    Math.max(0, Math.round(bufferInfo.percent * 100))
                  )}
                  %{durationMillis > 0 ? " of video cached" : " loaded"}
                </Text>
              </>
            ) : null}
          </View>
        ) : null}

        {videoError ? (
          <View style={styles.errorOverlay}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.errorTitle}>Playback Error</Text>
            <Text style={styles.errorMessage}>{videoError}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => {
                setVideoError(null);
                videoRef.current?.replayAsync();
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.controlsContainer} pointerEvents="box-none">
          {controlsVisible ? (
            <Pressable
              style={styles.overlayBackground}
              onPress={handleHideControls}
              accessibilityRole="button"
              accessibilityLabel="Hide controls"
            />
          ) : (
            <Pressable
              style={styles.overlayShowTrigger}
              onPress={handleShowControls}
              accessibilityRole="button"
              accessibilityLabel="Show controls"
            />
          )}

          <Animated.View
            pointerEvents={controlsVisible ? "auto" : "none"}
            style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
          >
            <View style={styles.contentWrapper}>
              <View style={styles.overlayHeader}>
                <Text style={styles.overlayTitleCentered} numberOfLines={1}>
                  {displayTitle}
                </Text>
                <Pressable
                  style={styles.dismissButton}
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Close video"
                >
                  <Ionicons name="close" size={22} color="#fff" />
                </Pressable>
              </View>

              <View style={styles.overlayCenterRow}>
                {hasFinished ? (
                  <Pressable
                    style={styles.overlayReplayButton}
                    onPress={handleReplay}
                    accessibilityRole="button"
                    accessibilityLabel="Replay video"
                  >
                    <Ionicons name="refresh" size={36} color="#fff" />
                    <Text style={styles.overlayReplayText}>Replay</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      style={styles.overlayIconButton}
                      onPress={() => handleSeek(-10_000)}
                      accessibilityRole="button"
                      accessibilityLabel="Seek backward 10 seconds"
                      disabled={!isLoaded}
                    >
                      <Ionicons name="play-back" size={30} color="#fff" />
                      <Text style={styles.overlayIconCaption}>10s</Text>
                    </Pressable>
                    <Pressable
                      style={styles.overlayPlayButton}
                      onPress={handleTogglePlay}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isPlaying ? "Pause video" : "Play video"
                      }
                      disabled={!isLoaded}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={36}
                        color="#fff"
                      />
                    </Pressable>
                    <Pressable
                      style={styles.overlayIconButton}
                      onPress={() => handleSeek(10_000)}
                      accessibilityRole="button"
                      accessibilityLabel="Seek forward 10 seconds"
                      disabled={!isLoaded}
                    >
                      <Ionicons name="play-forward" size={30} color="#fff" />
                      <Text style={styles.overlayIconCaption}>10s</Text>
                    </Pressable>
                  </>
                )}
              </View>

              <LinearGradient
                colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]}
                style={styles.overlayBottomGradient}
              >
                <Slider
                  style={styles.progressSlider}
                  value={progressValue}
                  minimumValue={0}
                  maximumValue={
                    durationMillis > 0
                      ? durationMillis
                      : Math.max(positionMillis + 1, 1)
                  }
                  minimumTrackTintColor="#38bdf8"
                  maximumTrackTintColor="rgba(255,255,255,0.25)"
                  thumbTintColor="#38bdf8"
                  disabled={!isLoaded}
                  onSlidingStart={handleSlidingStart}
                  onSlidingComplete={handleSlidingComplete}
                  onValueChange={handleSliderValueChange}
                />
                <View style={styles.overlayBottomRow}>
                  <Text style={styles.progressLabel}>
                    {formatTime(progressValue)}
                  </Text>
                  <View style={styles.overlayBottomRight}>
                    <Text style={styles.progressLabel}>
                      {formatTime(durationMillis)}
                    </Text>
                    <Pressable
                      style={styles.fullscreenButton}
                      onPress={handleEnterFullscreen}
                      accessibilityRole="button"
                      accessibilityLabel="Enter fullscreen"
                      disabled={!isLoaded}
                    >
                      <Ionicons name="expand" size={22} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{displayTitle}</Text>
        <View style={styles.socialRow}>
          <Pressable
            style={[styles.socialButton, isLiked && styles.socialButtonActive]}
            onPress={handleLikePress}
          >
            <Text style={styles.socialLabel}>{isLiked ? "Liked" : "Like"}</Text>
            <Text style={styles.socialCount}>{likes}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.socialButton,
              isDisliked && styles.socialButtonActive,
            ]}
            onPress={handleDislikePress}
          >
            <Text style={styles.socialLabel}>
              {isDisliked ? "Disliked" : "Dislike"}
            </Text>
            <Text style={styles.socialCount}>{dislikes}</Text>
          </Pressable>
        </View>

        {likesError && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={16} color="#f59e0b" />
            <Text style={styles.errorBannerText}>{likesError}</Text>
          </View>
        )}

        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
          <View style={styles.commentInputRow}>
            <TextInput
              value={commentDraft}
              onChangeText={setCommentDraft}
              placeholder="Add a public comment"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.commentInput}
              multiline
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => Keyboard.dismiss()}
            />
            <Pressable
              style={[
                styles.commentButton,
                (!commentDraft.trim() || isPostingComment || !token) &&
                  styles.commentButtonDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={
                !commentDraft.trim().length || isPostingComment || !token
              }
            >
              <Text style={styles.commentButtonText}>
                {isPostingComment ? "Posting..." : "Post"}
              </Text>
            </Pressable>
          </View>

          {commentsError && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={16} color="#f59e0b" />
              <Text style={styles.errorBannerText}>{commentsError}</Text>
            </View>
          )}

          {isLoadingComments ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : comments.length ? (
            <FlatList
              data={comments}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              contentContainerStyle={styles.commentList}
              renderItem={({ item }) => {
                const avatarUri = resolveAvatarUri(item.avatar);
                return (
                  <View style={styles.commentBubble}>
                    <View style={styles.commentHeader}>
                      <Image
                        source={{
                          uri: avatarUri || "https://via.placeholder.com/32",
                        }}
                        style={styles.commentAvatar}
                      />
                      <View style={styles.commentHeaderInfo}>
                        <View style={styles.commentUserRow}>
                          <Text style={styles.commentUsername}>
                            {item.username}
                          </Text>
                          {item.verified === 1 && (
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color="#38bdf8"
                              style={styles.verifiedBadge}
                            />
                          )}
                        </View>
                        <Text style={styles.commentTime}>
                          {new Date(item.time * 1000).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.commentText}>{item.text}</Text>
                  </View>
                );
              }}
              onEndReached={() => {
                loadMoreComments();
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isLoadingMoreComments ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : null
              }
            />
          ) : (
            <Text style={styles.emptyCommentsText}>
              Be the first to leave a comment.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#111",
    position: "relative",
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "stretch",
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayShowTrigger: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 0,
    paddingVertical: 20,
    justifyContent: "space-between",
  },
  overlayTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  overlayHeader: {
    position: "relative",
    top: -20,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
    paddingBottom: 2,
  },
  overlayTitleCentered: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 56, // space for the dismiss button
  },
  overlayTitle: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  dismissButton: {
    position: "absolute",
    top: -8,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  overlayCenterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 12,
    justifyContent: "space-between",
  },
  overlayIconButton: {
    alignItems: "center",
    gap: 4,
  },
  overlayIconCaption: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overlayPlayButton: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  overlayReplayButton: {
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  overlayReplayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  overlayBottomGradient: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    width: "100%",
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 20,
  },
  overlayBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  overlayBottomRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  fullscreenButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  bufferOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 24,
  },
  bufferLabel: {
    marginTop: 16,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  bufferSublabel: {
    marginTop: 6,
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    textAlign: "center",
  },
  bufferProgressTrack: {
    marginTop: 16,
    width: "70%",
    maxWidth: 320,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  bufferProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#38bdf8",
  },
  bufferPercentLabel: {
    marginTop: 8,
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  errorMessage: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#38bdf8",
  },
  retryButtonText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "700",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
  errorBannerText: {
    flex: 1,
    color: "#fbbf24",
    fontSize: 13,
    lineHeight: 18,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "#000",
  },
  progressSlider: {
    width: "100%",
    height: 32,
    paddingHorizontal: 16,
  },
  progressLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  socialButton: {
    flexGrow: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  socialButtonActive: {
    backgroundColor: "rgba(56,189,248,0.25)",
  },
  socialLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  socialCount: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 2,
  },
  commentsSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingTop: 6,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  commentInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: "#fff",
  },
  commentButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#38bdf8",
  },
  commentButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  commentButtonText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },
  commentList: {
    gap: 12,
  },
  commentBubble: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  commentHeaderInfo: {
    flex: 1,
  },
  commentUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentUsername: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  verifiedBadge: {
    marginLeft: 2,
  },
  commentTime: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 2,
  },
  commentText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  commentMeta: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: 6,
  },
  emptyCommentsText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  primaryButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#0ea5e9",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
