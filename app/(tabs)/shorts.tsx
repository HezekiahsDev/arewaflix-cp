import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { AVPlaybackStatus, Video as ExpoVideo, ResizeMode } from "expo-av";
import { useLocalSearchParams } from "expo-router";
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
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { useAuth } from "@/context/AuthContext";
import {
  VideoComment,
  fetchUserReaction,
  fetchVideoComments,
  fetchVideoLikes,
  postVideoComment,
  postVideoReaction,
} from "@/lib/api/video-interactions";
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

const API_BASE_URL = "https://api.arewaflix.io";
const BASE_VIDEO_URL = "https://arewaflix.s3.us-east-005.backblazeb2.com/";

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
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Try CDN first (avatars might be on CDN)
  const cdnBase = BASE_VIDEO_URL.endsWith("/")
    ? BASE_VIDEO_URL
    : `${BASE_VIDEO_URL}/`;
  const sanitized = trimmed.replace(/^\/+/, "");

  // Check if this looks like a CDN path (contains "upload/photos")
  if (sanitized.includes("upload/photos")) {
    return `${cdnBase}${sanitized}`;
  }

  // Fallback to API base URL for other paths
  const resolvedUrl = `${API_BASE_URL}/${sanitized}`;
  return resolvedUrl;
}

type ShortMedia = { kind: "video"; uri: string } | { kind: "none" };

type PlayableShort = {
  video: VideoModel;
  source: {
    uri: string;
    origin: "direct";
  };
};

function toShortMedia(media: VideoMedia): ShortMedia {
  if (media.kind === "direct") {
    return { kind: "video", uri: media.uri };
  }

  // We only support direct video playback in Shorts. Treat any non-direct
  // media as unsupported.
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

  return null;
}

type ShortPlayerCardProps = {
  item: PlayableShort;
  isActive: boolean;
  topInset: number;
  bottomInset: number;
  onOpenComments: (videoId: string) => void;
};

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

const IconDefaults = { size: 28, color: "#fff" } as const;

const HeartIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
        fill={color}
      />
    </Svg>
  )
);

const CommentIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        fill={color}
      />
    </Svg>
  )
);

const VolumeIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
  }: {
    size?: number;
    color?: string;
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
  )
);

const VolumeOffIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
  }: {
    size?: number;
    color?: string;
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
  )
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  fullScreen: { flex: 1 },
  topBadge: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bottomMeta: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  bufferingOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  centerPlayPauseButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -36,
    marginTop: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  centerPlayPauseIcon: { width: 36, height: 36 },
  rightActions: { position: "absolute", right: 12, alignItems: "center" },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressFill: { height: "100%", backgroundColor: "#ff0055" },
});

const modalStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 8,
  },
  errorBannerText: {
    flex: 1,
    color: "#fbbf24",
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  commentList: {
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
  },
  commentInputContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#000",
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
  loginPrompt: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  loginPromptText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
});

const ShortPlayerCard = React.memo(
  function ShortPlayerCard({
    item,
    isActive,
    topInset,
    bottomInset,
    onOpenComments,
  }: ShortPlayerCardProps) {
    const { user, token } = useAuth();
    const videoRef = useRef<ExpoVideo | null>(null);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState<boolean>(Platform.OS === "web");
    const [isPlayingLocal, setIsPlayingLocal] = useState<boolean>(false);
    // used to force a remount/reload of the ExpoVideo component when user requests reload
    const [reloadKey, setReloadKey] = useState<number>(0);
    const [progress, setProgress] = useState<number>(0);
    const [timeRemainingLabel, setTimeRemainingLabel] = useState<string | null>(
      null
    );

    // Interaction states
    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [comments, setComments] = useState<VideoComment[]>([]);
    const [isLoadingLikes, setIsLoadingLikes] = useState(false);
    const [isPostingReaction, setIsPostingReaction] = useState(false);

    // Double tap to like
    const lastTap = useRef<number>(0);
    const doubleTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const likeAnimationScale = useRef(new Animated.Value(0)).current;

    // Center play/pause auto-hide animation
    const centerAnim = useRef(new Animated.Value(1)).current;
    const [centerTouchable, setCenterTouchable] = useState(true);
    const centerHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
    const CENTER_HIDE_DELAY = 1500; // ms

    const showCenterButton = useCallback(() => {
      if (centerHideTimeout.current) {
        clearTimeout(centerHideTimeout.current);
        centerHideTimeout.current = null;
      }
      setCenterTouchable(true);
      Animated.timing(centerAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();

      centerHideTimeout.current = setTimeout(() => {
        if (centerHideTimeout.current) {
          clearTimeout(centerHideTimeout.current);
          centerHideTimeout.current = null;
        }
        Animated.timing(centerAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setCenterTouchable(false));
      }, CENTER_HIDE_DELAY);
    }, [centerAnim]);

    const hideCenterButton = useCallback(() => {
      if (centerHideTimeout.current) {
        clearTimeout(centerHideTimeout.current);
        centerHideTimeout.current = null;
      }
      Animated.timing(centerAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setCenterTouchable(false));
    }, [centerAnim]);

    // throttle progress updates: at most every 250ms or when percent changes >= 1%
    const lastProgressUpdateTs = useRef<number>(0);
    const lastProgressPct = useRef<number>(-1);

    const videoId = item.video.id;

    // Load likes and user reaction when video becomes active
    useEffect(() => {
      if (!isActive || !videoId) return;

      const controller = new AbortController();

      const loadInteractions = async () => {
        setIsLoadingLikes(true);
        try {
          // Fetch likes
          const likesResp = await fetchVideoLikes(videoId, controller.signal);
          setLikes(likesResp.data.likes || 0);

          // Fetch user reaction if authenticated
          if (token) {
            const reactionResp = await fetchUserReaction(
              videoId,
              token,
              controller.signal
            );
            setIsLiked(reactionResp.data.reaction === 1);
          }

          // Fetch comments count (just first page to get count)
          const commentsResp = await fetchVideoComments(videoId, {
            page: 1,
            limit: 1,
            signal: controller.signal,
          });
          setComments(commentsResp.data || []);
        } catch (error) {
          if (!controller.signal.aborted && __DEV__) {
            console.warn("Failed to load interactions:", error);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsLoadingLikes(false);
          }
        }
      };

      loadInteractions();

      return () => {
        controller.abort();
      };
    }, [isActive, videoId, token]);

    const handleLikePress = useCallback(async () => {
      if (!videoId || !token || isPostingReaction) {
        return;
      }

      setIsPostingReaction(true);
      try {
        // Post the reaction first
        const response = await postVideoReaction(videoId, "like", token);

        // Apply server-provided count immediately
        if (response?.data?.likes !== undefined) {
          setLikes(response.data.likes);
        }

        // Then re-fetch likes to ensure we have the canonical count
        try {
          const likesResp = await fetchVideoLikes(videoId);
          setLikes(likesResp?.data?.likes ?? response?.data?.likes ?? 0);
        } catch (refreshErr) {
          // If refresh fails, keep the value from the reaction response.
          if (__DEV__) console.warn("Failed to refresh likes:", refreshErr);
        }

        // Toggle local liked state (server toggles on backend)
        setIsLiked((prev) => !prev);
      } catch (error) {
        if (__DEV__) {
          console.warn("Failed to update reaction:", error);
        }
      } finally {
        setIsPostingReaction(false);
      }
    }, [videoId, token, isPostingReaction]);

    const animateLike = useCallback(() => {
      likeAnimationScale.setValue(0);
      Animated.sequence([
        Animated.spring(likeAnimationScale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.timing(likeAnimationScale, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, [likeAnimationScale]);

    const handleDoubleTap = useCallback(() => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (doubleTapTimeout.current) {
        clearTimeout(doubleTapTimeout.current);
        doubleTapTimeout.current = null;
      }

      if (now - lastTap.current < DOUBLE_TAP_DELAY) {
        // Double tap detected
        lastTap.current = 0;

        // Only like if not already liked
        if (!isLiked && token) {
          animateLike();
          handleLikePress();
        }
      } else {
        // Single tap - toggle play/pause
        lastTap.current = now;
        doubleTapTimeout.current = setTimeout(() => {
          togglePlayPause();
          doubleTapTimeout.current = null;
        }, DOUBLE_TAP_DELAY);
      }
    }, [isLiked, token, animateLike, handleLikePress]);

    useEffect(() => {
      const player = videoRef.current;
      if (!player) return;

      if (isActive && !hasError) {
        // ensure muted on web to allow autoplay
        (player as any).setIsMutedAsync?.(isMuted).catch(() => {});
        player.playAsync().catch(() => {});
      } else {
        player.pauseAsync().catch(() => {});
      }
    }, [isActive, hasError, isMuted, item.source]);

    // Auto-hide center play/pause button: show on mount and on playback state changes.
    useEffect(() => {
      // Always show button initially so user knows control exists
      showCenterButton();

      return () => {
        if (centerHideTimeout.current) {
          clearTimeout(centerHideTimeout.current);
          centerHideTimeout.current = null;
        }
      };
    }, []);

    useEffect(() => {
      // If buffering or there's an error, keep the control visible
      if (isBuffering || hasError) {
        if (centerHideTimeout.current) {
          clearTimeout(centerHideTimeout.current);
          centerHideTimeout.current = null;
        }
        setCenterTouchable(true);
        Animated.timing(centerAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
        return;
      }

      // When playing, schedule hide; when paused, ensure visible
      if (isPlayingLocal) {
        showCenterButton();
      } else {
        // paused -> keep visible
        if (centerHideTimeout.current) {
          clearTimeout(centerHideTimeout.current);
          centerHideTimeout.current = null;
        }
        setCenterTouchable(true);
        Animated.timing(centerAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }
    }, [isPlayingLocal, isBuffering, hasError, showCenterButton, centerAnim]);

    const handleStatusUpdate = useCallback(
      (status: AVPlaybackStatus) => {
        const s = status as any;
        if (!s) return;

        // Do not treat transient unloaded states as fatal errors. Only set an error
        // if the player reports an actual error payload when not loaded.
        if (s.isLoaded === false) {
          if (s.error) {
            setHasError(
              typeof s.error === "string" ? s.error : "Unable to load video"
            );
          }
          // keep buffering/playing flags in sync if provided
          setIsBuffering(Boolean(s.isBuffering));
          setIsPlayingLocal(Boolean(s.isPlaying));
          return;
        }

        // When loaded successfully, clear any prior error and update playback state
        if (hasError) setHasError(null);

        setIsBuffering(Boolean(s.isBuffering));
        setIsPlayingLocal(Boolean(s.isPlaying));
        if (s.durationMillis && s.positionMillis) {
          const pct = Math.max(
            0,
            Math.min(100, (s.positionMillis / s.durationMillis) * 100)
          );
          const now = Date.now();
          const lastTs = lastProgressUpdateTs.current;
          const lastPct = lastProgressPct.current;
          if (now - lastTs > 250 || Math.abs(pct - lastPct) >= 1) {
            lastProgressUpdateTs.current = now;
            lastProgressPct.current = pct;
            setProgress(Number.isFinite(pct) ? Math.round(pct * 100) / 100 : 0);
          }
          // update countdown label (duration - position)
          const remaining = Math.max(
            0,
            (s.durationMillis ?? 0) - (s.positionMillis ?? 0)
          );
          setTimeRemainingLabel(formatTime(remaining));
        } else {
          if (lastProgressPct.current !== 0) {
            lastProgressPct.current = 0;
            setProgress(0);
          }
          setTimeRemainingLabel(null);
        }
      },
      [hasError]
    );

    const handleError = useCallback((err: unknown) => {
      if (__DEV__) console.warn("Video onError", err);
      setHasError("Playback error");
    }, []);

    const togglePlayPause = useCallback(() => {
      const player = videoRef.current;
      if (!player) return;
      if (isPlayingLocal) {
        void player
          .pauseAsync()
          .then(() => setIsPlayingLocal(false))
          .catch(() => {});
      } else {
        void player
          .playAsync()
          .then(() => setIsPlayingLocal(true))
          .catch(() => {});
      }
      // show center control briefly when user toggles playback
      try {
        showCenterButton();
      } catch (e) {
        // ignore
      }
    }, [isPlayingLocal, showCenterButton]);

    const toggleMute = useCallback(() => {
      const next = !isMuted;
      setIsMuted(next);
      const player = videoRef.current;
      if (!player) return;
      void (player as any).setIsMutedAsync?.(next).catch(() => {});
      void (player as any)
        .setStatusAsync?.({ volume: next ? 0 : 1 })
        .catch(() => {});
    }, [isMuted]);

    const durationLabel = useMemo(
      () => getDurationLabel(item.video),
      [item.video]
    );

    const commentsCount = comments.length;
    const likesDisplay = useMemo(() => {
      const likeCount = likes || 0;
      return likeCount >= 1000
        ? `${(likeCount / 1000).toFixed(1)}K`
        : likeCount.toString();
    }, [likes]);

    return (
      <View style={styles.root}>
        <Pressable
          style={styles.fullScreen}
          onPress={handleDoubleTap}
          android_ripple={{ color: "rgba(255,255,255,0.02)" }}
        >
          <ExpoVideo
            key={reloadKey}
            ref={videoRef}
            style={styles.fullScreen}
            source={{ uri: item.source.uri }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isActive && !hasError}
            isLooping
            volume={isMuted ? 0 : 1}
            isMuted={isMuted}
            posterSource={{ uri: item.video.imageUrl }}
            posterStyle={{ resizeMode: "cover" }}
            usePoster
            onPlaybackStatusUpdate={handleStatusUpdate}
            onError={handleError}
            onLoadStart={() => setIsBuffering(true)}
            onLoad={() => setIsBuffering(false)}
          />

          {/* Double tap like animation */}
          <Animated.View
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              marginLeft: -60,
              marginTop: -60,
              opacity: likeAnimationScale,
              transform: [{ scale: likeAnimationScale }],
            }}
            pointerEvents="none"
          >
            <HeartIcon size={120} color="#ff2d55" />
          </Animated.View>

          {/* Center play/pause button (explicit control) */}
          <Animated.View
            style={[styles.centerPlayPauseButton, { opacity: centerAnim }]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={() => {
                togglePlayPause();
              }}
              accessibilityRole="button"
              accessibilityLabel={isPlayingLocal ? "Pause" : "Play"}
              pointerEvents={centerTouchable ? "auto" : "none"}
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
              }}
            >
              {isPlayingLocal ? (
                <Ionicons name="pause" size={28} color="#fff" />
              ) : (
                <Ionicons name="play" size={28} color="#fff" />
              )}
            </Pressable>
          </Animated.View>
        </Pressable>

        <View
          style={{
            position: "absolute",
            // shift up slightly so controls sit closer to status bar/header
            top: topInset + 8,
            left: 16,
            right: 16,
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {timeRemainingLabel || durationLabel ? (
              <View style={styles.topBadge}>
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
                >
                  {timeRemainingLabel ?? durationLabel}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={toggleMute}
              style={{
                marginLeft: 10,
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.45)",
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityRole="button"
              accessibilityLabel={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeOffIcon size={20} color="#fff" />
              ) : (
                <VolumeIcon size={20} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>

        <View style={[styles.bottomMeta, { bottom: bottomInset + 32 }]}>
          <Text
            style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}
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
            style={[
              styles.bufferingOverlay,
              { backgroundColor: hasError ? "rgba(0,0,0,0.6)" : "transparent" },
            ]}
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
                    marginTop: 12,
                    marginBottom: 6,
                  }}
                >
                  Unable to load this video. Try reloading.
                </Text>

                <Pressable
                  onPress={() => {
                    // clear the error and force a remount of ExpoVideo to retry loading
                    setHasError(null);
                    setIsBuffering(true);
                    // attempt to unload the player first if possible
                    try {
                      void videoRef.current?.unloadAsync?.();
                    } catch (e) {
                      // ignore
                    }
                    setReloadKey((k) => k + 1);
                  }}
                  style={{
                    marginTop: 6,
                    backgroundColor: "#ff0055",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    Reload
                  </Text>
                </Pressable>
              </View>
            ) : (
              <ActivityIndicator size="large" color="#ffffff" />
            )}
          </View>
        )}

        <View style={[styles.rightActions, { bottom: bottomInset + 120 }]}>
          <Pressable
            style={{ alignItems: "center", marginBottom: 18 }}
            onPress={handleLikePress}
            disabled={!token || isPostingReaction}
          >
            <HeartIcon size={34} color={isLiked ? "#ff2d55" : "#fff"} />
            <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>
              {likesDisplay}
            </Text>
          </Pressable>

          <Pressable
            style={{ alignItems: "center", marginBottom: 18 }}
            onPress={() => onOpenComments(videoId)}
          >
            <CommentIcon size={30} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>
              {commentsCount}
            </Text>
          </Pressable>

          {/* mute control moved to top-right */}
        </View>

        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: bottomInset + 12,
            height: 4,
          }}
        >
          <View style={[styles.progressTrack]}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.isActive === next.isActive &&
      prev.item.video.id === next.item.video.id &&
      prev.topInset === next.topInset &&
      prev.bottomInset === next.bottomInset &&
      prev.onOpenComments === next.onOpenComments
    );
  }
);

export default function ShortsScreen() {
  const { user, token } = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ videoId?: string }>();

  const [shorts, setShorts] = useState<PlayableShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsupportedCount, setUnsupportedCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Comment modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);

  const COMMENTS_PAGE_LIMIT = 20;

  const requestRef = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Handle opening comment modal
  const handleOpenComments = useCallback(
    async (videoId: string) => {
      setSelectedVideoId(videoId);
      setCommentModalVisible(true);
      setIsLoadingComments(true);
      setCommentsError(null);
      setCommentsPage(1);

      try {
        const resp = await fetchVideoComments(videoId, {
          page: 1,
          limit: COMMENTS_PAGE_LIMIT,
        });
        setComments(resp.data || []);
        setCommentsPage(resp.pagination?.page ?? 1);
        setCommentsTotalPages(resp.pagination?.totalPages ?? 1);
      } catch (error) {
        setCommentsError("Failed to load comments.");
      } finally {
        setIsLoadingComments(false);
      }
    },
    [COMMENTS_PAGE_LIMIT]
  );

  // Handle closing comment modal
  const handleCloseComments = useCallback(() => {
    setCommentModalVisible(false);
    setSelectedVideoId(null);
    setComments([]);
    setCommentDraft("");
    setCommentsError(null);
  }, []);

  // Handle posting comment
  const handleSubmitComment = useCallback(async () => {
    const trimmed = commentDraft.trim();
    if (!trimmed.length || !selectedVideoId || !token) {
      return;
    }

    Keyboard.dismiss();

    setIsPostingComment(true);
    setCommentsError(null);
    try {
      await postVideoComment(selectedVideoId, trimmed, token);
      setCommentDraft("");

      // Refetch comments (page 1)
      const resp = await fetchVideoComments(selectedVideoId, {
        page: 1,
        limit: COMMENTS_PAGE_LIMIT,
      });
      setComments(resp.data || []);
      setCommentsPage(resp.pagination?.page ?? 1);
      setCommentsTotalPages(resp.pagination?.totalPages ?? 1);
    } catch (error) {
      setCommentsError("Failed to post comment. Please try again.");
    } finally {
      setIsPostingComment(false);
    }
  }, [commentDraft, selectedVideoId, token, COMMENTS_PAGE_LIMIT]);

  // Load more comments
  const loadMoreComments = useCallback(async () => {
    if (!selectedVideoId) return;
    if (isLoadingMoreComments) return;
    if (commentsPage >= commentsTotalPages) return;

    setIsLoadingMoreComments(true);
    try {
      const nextPage = commentsPage + 1;
      const resp = await fetchVideoComments(selectedVideoId, {
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
  }, [
    commentsPage,
    commentsTotalPages,
    isLoadingMoreComments,
    selectedVideoId,
    COMMENTS_PAGE_LIMIT,
  ]);

  // Lower threshold to make activation a bit more permissive for shorter screens,
  // and add logging to help trace active index changes during debugging.
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
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

        // (dev logging removed for production)
        const { media, short } = resolveShortMedia(video);

        // (dev logging removed for production)

        if (short.kind === "video") {
          playable.push({
            video,
            source: { uri: short.uri, origin: "direct" },
          });
        } else {
          // Non-direct media are unsupported for Shorts
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

        // (dev logging removed for production)
        const { playable, unsupported } = await hydrateShorts(
          videos,
          controller.signal
        );

        // (dev logging removed for production)

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

  // Handle scrolling to specific video when videoId param is provided
  useEffect(() => {
    if (params.videoId && shorts.length > 0) {
      const targetIndex = shorts.findIndex(
        (short) => short.video.id === params.videoId
      );
      if (targetIndex !== -1 && flatListRef.current) {
        // Small delay to ensure FlatList is ready
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: targetIndex,
            animated: false,
          });
          setActiveIndex(targetIndex);
        }, 100);
      }
    }
  }, [params.videoId, shorts]);

  const handleRefresh = useCallback(() => {
    void loadShorts(true);
  }, [loadShorts]);
  const { height: windowHeight } = useWindowDimensions();
  const initialItemHeight = useMemo(
    () => windowHeight - insets.top - insets.bottom,
    [windowHeight, insets.top, insets.bottom]
  );

  // Measure the actual available container height at runtime so we can size
  // each short to the visible area between the header and the tab bar. This
  // avoids hardcoding header/tab heights which can vary between devices.
  const [containerHeight, setContainerHeight] =
    useState<number>(initialItemHeight);
  const itemHeight = containerHeight;

  const renderItem = useCallback(
    ({ item, index }: { item: PlayableShort; index: number }) => (
      <View style={{ height: itemHeight, width: "100%" }}>
        <ShortPlayerCard
          item={item}
          isActive={isFocused && index === activeIndex}
          topInset={insets.top}
          bottomInset={insets.bottom}
          onOpenComments={handleOpenComments}
        />
      </View>
    ),
    [
      activeIndex,
      insets.bottom,
      insets.top,
      isFocused,
      itemHeight,
      handleOpenComments,
    ]
  );

  // (dev logging removed)

  const activeSourceUri = shorts[activeIndex]?.source?.uri;

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
        <Text
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 14,
            marginTop: 16,
          }}
        >
          Loading shorts...
        </Text>
      </View>
    );
  }

  if (error && !shorts.length) {
    const is429Error =
      error.toLowerCase().includes("429") ||
      error.toLowerCase().includes("rate limit");
    const isNetworkError =
      error.toLowerCase().includes("network") ||
      error.toLowerCase().includes("connection");

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        {/* Error Icon */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        </View>

        {/* Error Title */}
        <Text
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          {is429Error
            ? "Too Many Requests"
            : isNetworkError
              ? "Connection Error"
              : "Unable to Load Shorts"}
        </Text>

        {/* Error Message */}
        <Text
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 15,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          {is429Error
            ? "We're receiving a lot of traffic right now. Please wait a moment and try again."
            : isNetworkError
              ? "Please check your internet connection and try again."
              : error}
        </Text>

        {/* Reload Button */}
        <Pressable
          onPress={handleRefresh}
          disabled={refreshing}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: 999,
            backgroundColor: refreshing ? "rgba(255,255,255,0.2)" : "#ff0055",
          }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="refresh" size={20} color="#fff" />
          )}
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            {refreshing ? "Loading..." : "Try Again"}
          </Text>
        </Pressable>

        {/* Additional Help Text */}
        {is429Error && (
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 13,
              textAlign: "center",
              marginTop: 24,
            }}
          >
            This usually resolves in a few seconds
          </Text>
        )}
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
          paddingHorizontal: 32,
        }}
      >
        {/* Empty Icon */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: "rgba(156, 163, 175, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Ionicons name="film-outline" size={48} color="#9ca3af" />
        </View>

        {/* Empty Title */}
        <Text
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: "700",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          No Shorts Available
        </Text>

        {/* Empty Message */}
        <Text
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 15,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 32,
          }}
        >
          Check back later for new content
        </Text>

        {/* Reload Button */}
        <Pressable
          onPress={handleRefresh}
          disabled={refreshing}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: 999,
            backgroundColor: refreshing ? "rgba(255,255,255,0.2)" : "#ff0055",
          }}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="refresh" size={20} color="#fff" />
          )}
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            {refreshing ? "Loading..." : "Refresh"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: "#000" }}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h && h > 0 && h !== containerHeight) setContainerHeight(h);
      }}
    >
      {/* Dev-only overlay removed — was showing active index and source URI */}
      <FlatList
        ref={flatListRef}
        data={shorts}
        renderItem={renderItem}
        keyExtractor={(item) => item.video.id}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        removeClippedSubviews={true}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to offset if index fails
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            });
          });
        }}
      />

      {/* Comment Modal */}
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseComments}
      >
        <KeyboardAvoidingView
          style={modalStyles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.bottom + 60}
        >
          {/* Header */}
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>
              Comments ({comments.length})
            </Text>
            <Pressable
              onPress={handleCloseComments}
              style={modalStyles.closeButton}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
          </View>

          {/* Comments List */}
          <View style={{ flex: 1 }}>
            {commentsError && (
              <View style={modalStyles.errorBanner}>
                <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                <Text style={modalStyles.errorBannerText}>{commentsError}</Text>
                <Pressable
                  onPress={() => {
                    if (selectedVideoId) {
                      setCommentsError(null);
                      handleOpenComments(selectedVideoId);
                    }
                  }}
                  style={modalStyles.retryButton}
                >
                  <Ionicons name="refresh" size={16} color="#fff" />
                </Pressable>
              </View>
            )}

            {isLoadingComments ? (
              <View style={modalStyles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : commentsError && !comments.length ? (
              <View style={modalStyles.emptyContainer}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={64}
                  color="rgba(255,255,255,0.3)"
                />
                <Text
                  style={[
                    modalStyles.emptyText,
                    { marginTop: 16, fontSize: 16, fontWeight: "600" },
                  ]}
                >
                  Unable to load comments
                </Text>
                <Text style={[modalStyles.emptyText, { marginTop: 8 }]}>
                  Please check your connection
                </Text>
                <Pressable
                  onPress={() => {
                    if (selectedVideoId) {
                      setCommentsError(null);
                      handleOpenComments(selectedVideoId);
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: "#ff0055",
                    marginTop: 20,
                  }}
                >
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text
                    style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}
                  >
                    Try Again
                  </Text>
                </Pressable>
              </View>
            ) : comments.length ? (
              <FlatList
                data={comments}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                contentContainerStyle={modalStyles.commentList}
                onEndReached={loadMoreComments}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                  isLoadingMoreComments ? (
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                      style={{ marginVertical: 16 }}
                    />
                  ) : null
                }
                renderItem={({ item }) => {
                  const avatarUri = resolveAvatarUri(item.avatar);
                  return (
                    <View style={modalStyles.commentBubble}>
                      <View style={modalStyles.commentHeader}>
                        <Image
                          source={{
                            uri: avatarUri || "https://via.placeholder.com/32",
                          }}
                          style={modalStyles.commentAvatar}
                        />
                        <View style={modalStyles.commentHeaderInfo}>
                          <View style={modalStyles.commentUserRow}>
                            <Text style={modalStyles.commentUsername}>
                              {item.username}
                            </Text>
                            {item.verified === 1 && (
                              <Ionicons
                                name="checkmark-circle"
                                size={14}
                                color="#38bdf8"
                                style={modalStyles.verifiedBadge}
                              />
                            )}
                          </View>
                          <Text style={modalStyles.commentTime}>
                            {new Date(item.time * 1000).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Text style={modalStyles.commentText}>{item.text}</Text>
                    </View>
                  );
                }}
              />
            ) : (
              <View style={modalStyles.emptyContainer}>
                <Text style={modalStyles.emptyText}>
                  No comments yet. Be the first to comment!
                </Text>
              </View>
            )}
          </View>

          {/* Comment Input */}
          {token ? (
            <View style={modalStyles.commentInputContainer}>
              <TextInput
                value={commentDraft}
                onChangeText={setCommentDraft}
                placeholder="Add a comment..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={modalStyles.commentInput}
                multiline
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Pressable
                style={[
                  modalStyles.commentButton,
                  (!commentDraft.trim() || isPostingComment) &&
                    modalStyles.commentButtonDisabled,
                ]}
                onPress={handleSubmitComment}
                disabled={!commentDraft.trim().length || isPostingComment}
              >
                <Text style={modalStyles.commentButtonText}>
                  {isPostingComment ? "Posting..." : "Post"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={modalStyles.loginPrompt}>
              <Text style={modalStyles.loginPromptText}>
                Sign in to leave a comment
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
