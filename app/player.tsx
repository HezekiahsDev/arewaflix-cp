import BlockContentModal from "@/components/BlockContentModal";
import PlayerDetails from "@/components/PlayerDetails";
import PlayerVideoContainer from "@/components/PlayerVideoContainer";
import ReportModal from "@/components/ReportModal";
import { useAuth } from "@/context/AuthContext";
import { useFullscreen } from "@/context/FullscreenContext";
import {
  ApiError,
  fetchCommentReaction,
  fetchUserReaction,
  fetchVideoComments,
  fetchVideoLikes,
  fetchVideoSaved,
  postCommentReaction,
  postVideoComment,
  postVideoReaction,
  saveVideo,
  trackVideoView,
  unsaveVideo,
  VideoComment,
} from "@/lib/api/video-interactions";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";
import { findBlockedWords } from "@/lib/moderation";
import {
  Audio,
  AVPlaybackStatus,
  AVPlaybackStatusSuccess,
  Video as ExpoVideo,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const BASE_VIDEO_URL = "https://arewaflix.s3.us-east-005.backblazeb2.com/";
const API_BASE_URL = "https://api.arewaflix.io";
const API_HOSTNAMES = ["api.arewaflix.io", "arewaflix.io", "www.arewaflix.io"];

// SVG Icon Components
const HeartIcon = React.memo(
  ({ size = 24, color = "#fff" }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
        fill={color}
      />
    </Svg>
  )
);

const ReportIcon = React.memo(
  ({ size = 24, color = "#fff" }: { size?: number; color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        fill={color}
      />
      <Path d="M12 9v4" stroke="#000" strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M12 17h.01"
        stroke="#000"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  )
);

const SaveIcon = React.memo(
  ({
    size = 24,
    color = "#fff",
    filled = false,
  }: {
    size?: number;
    color?: string;
    filled?: boolean;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
);

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
    return trimmed;
  }

  // Try CDN first (avatars might be on CDN)
  const cdnBase = ensureTrailingSlash(BASE_VIDEO_URL);
  const sanitized = trimmed.replace(/^\/+/, "");

  // Check if this looks like a CDN path (contains "upload/photos")
  if (sanitized.includes("upload/photos")) {
    const resolvedUrl = `${cdnBase}${encodeURI(sanitized)}`;
    return resolvedUrl;
  }

  // Fallback to API base URL for other paths
  const resolvedUrl = `${API_BASE_URL}/${sanitized}`;
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

  // Lock orientation to portrait when player loads, restore to default on unmount
  useEffect(() => {
    (async () => {
      try {
        // Lock to portrait initially
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      } catch (error) {
        // Failed to lock orientation - not critical
      }
    })();

    return () => {
      // Cleanup: restore to default orientation when leaving player
      (async () => {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
        } catch (error) {
          // Failed to restore orientation - not critical
        }
      })();
    };
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

  // Comment like state
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    new Set()
  );
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);

  // Report modal state (delegated to ReportModal component)
  const [reportModalVisible, setReportModalVisible] = useState(false);
  // If reporting a comment, this holds the comment id; otherwise null
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(
    null
  );
  const [reportingUserId, setReportingUserId] = useState<string | null>(null);

  // Block modal state
  const [blockModalVisible, setBlockModalVisible] = useState(false);

  // Saved state (local for demo - should be persisted)
  const [isSaved, setIsSaved] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const [isPostingReaction, setIsPostingReaction] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Error states
  const [videoError, setVideoError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [likesError, setLikesError] = useState<string | null>(null);

  const COMMENTS_PAGE_LIMIT = 20;
  const COMMENTS_REFRESH_INTERVAL = 30000; // 30 seconds

  const { user, token } = useAuth();
  const { setFullscreen } = useFullscreen();

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

  // Function to refresh comments (reusable for initial load and periodic updates)
  const refreshComments = useCallback(
    async (signal?: AbortSignal, silent = false) => {
      if (!videoId) return;

      if (!silent) {
        setIsLoadingComments(true);
        setCommentsError(null);
      }

      try {
        const commentsResponse = await fetchVideoComments(videoId, {
          page: 1,
          limit: COMMENTS_PAGE_LIMIT,
          signal,
          token: token ?? undefined,
        });

        setComments(commentsResponse.data);
        setCommentsPage(commentsResponse.pagination?.page ?? 1);
        setCommentsTotalPages(commentsResponse.pagination?.totalPages ?? 1);
        // Clear any previous errors on successful refresh only if it was a user-initiated action
        if (commentsError && !silent) {
          setCommentsError(null);
        }
      } catch (error) {
        // Only show errors for user-initiated actions (not silent background refreshes)
        if ((error as Error).name !== "AbortError" && !silent) {
          setCommentsError("Failed to load comments. Please try again later.");
        }
        // Silent failures are ignored to avoid disrupting the user experience
      } finally {
        if (!silent) {
          setIsLoadingComments(false);
        }
      }
    },
    [videoId, commentsError]
  );

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
            token: token ?? undefined,
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
          const reason = commentsResponse.reason as any;
          if (reason?.name !== "AbortError") {
            if (reason instanceof ApiError) {
              if (reason.status === 401) {
                setCommentsError("Please login to view comments.");
              } else if (reason.status === 502) {
                setCommentsError(
                  "Comments service temporarily unavailable. Please try again later."
                );
              } else {
                setCommentsError(
                  "Failed to load comments. Please try again later."
                );
              }
            } else {
              setCommentsError(
                "Failed to load comments. Please try again later."
              );
            }
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
          // Also fetch per-comment reactions for initial comments page
          try {
            const commentsForReactions =
              commentsResponse.status === "fulfilled"
                ? commentsResponse.value.data
                : [];
            if (commentsForReactions && commentsForReactions.length) {
              const r = await Promise.all(
                commentsForReactions.map(async (c) => {
                  try {
                    const resp = await fetchCommentReaction(
                      videoId,
                      c.id,
                      token,
                      controller.signal
                    );
                    return {
                      id: String(c.id),
                      reaction: resp?.data?.reaction ?? null,
                    };
                  } catch (e) {
                    return { id: String(c.id), reaction: null };
                  }
                })
              );

              setLikedCommentIds((prev) => {
                const next = new Set(prev);
                for (const it of r) {
                  if (it.reaction === "like") next.add(it.id);
                  else next.delete(it.id);
                }
                return next;
              });
            }
          } catch (e) {
            // ignore per-comment reaction failures
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

  // Fetch persisted saved state from API so the toggle reflects server-side state
  useEffect(() => {
    if (!videoId) return;

    const controller = new AbortController();

    (async () => {
      if (!token) {
        // Not authenticated — keep local default
        return;
      }

      try {
        const isSavedFlag = await fetchVideoSaved(
          videoId,
          token,
          controller.signal
        );
        setIsSaved(Boolean(isSavedFlag));
      } catch (err) {
        if (__DEV__) console.warn("Failed to fetch saved state:", err);
      }
    })();

    return () => controller.abort();
  }, [videoId, token]);

  // Auto-refresh comments at safe intervals
  useEffect(() => {
    if (!videoId) return;

    const intervalId = setInterval(() => {
      // Silently refresh comments in the background
      refreshComments(undefined, true);
    }, COMMENTS_REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [videoId, refreshComments]);

  // Track view when video loads and starts playing
  useEffect(() => {
    if (!videoId || !isLoaded || !isPlaying) return;

    let hasTracked = false;

    (async () => {
      if (hasTracked) return;
      hasTracked = true;

      try {
        // Get persistent device fingerprint to prevent Sybil attacks.
        // If the user denied ATT, `getDeviceFingerprint()` will return null
        // and we must NOT call the tracking endpoint.
        const fingerprint = await getDeviceFingerprint();
        if (!fingerprint) {
          // Tracking not authorized — skip view tracking
          return;
        }

        const response = await trackVideoView(videoId, {
          fingerprint,
          userId: user?.id,
        });
      } catch (error) {
        // Failed to track view — non-fatal
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

      if (isBuffering) {
        return;
      }

      registerInteraction();

      // Use current position from state for more reliable seeking
      const current = positionMillis || successStatus?.positionMillis || 0;
      const duration = successStatus?.durationMillis || durationMillis || 0;

      if (duration <= 0) {
        return;
      }

      const target = Math.min(Math.max(current + deltaMillis, 0), duration);

      try {
        // Temporarily set seeking state to prevent conflicts
        setIsSeeking(true);
        await video.setPositionAsync(target, {
          toleranceMillisBefore: 1000,
          toleranceMillisAfter: 1000,
        });
        // The position will be updated via status callback
      } catch (error) {
        console.error("Seek failed:", error);
      } finally {
        // Reset seeking state after a brief delay
        setTimeout(() => setIsSeeking(false), 100);
      }
    },
    [
      durationMillis,
      isLoaded,
      isBuffering,
      positionMillis,
      registerInteraction,
      successStatus,
    ]
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

  const handleSavePress = useCallback(async () => {
    if (!videoId) return;

    const wasSaved = isSaved;
    // Optimistic UI
    setIsSaved((prev) => !prev);

    if (!token) {
      // Revert because saving requires authentication
      setIsSaved(wasSaved);
      return;
    }

    try {
      if (!wasSaved) {
        await saveVideo(videoId, token);
      } else {
        await unsaveVideo(videoId, token);
      }
    } catch (error) {
      // Revert on error
      setIsSaved(wasSaved);
      if (__DEV__) console.warn("Failed to toggle save state:", error);
    }
  }, [videoId, token, isSaved]);

  const handleReportPress = useCallback(
    (commentId?: string | null, userId?: string | null) => {
      setReportingCommentId(commentId ?? null);
      setReportingUserId(userId ?? null);
      setReportModalVisible(true);
    },
    []
  );

  const handleBlockPress = useCallback(() => {
    setBlockModalVisible(true);
  }, []);

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
      // Client-side moderation: block comments containing disallowed words
      const matches = findBlockedWords(trimmed);
      if (matches.length) {
        setCommentsError(
          "Your comment contains language that violates our community guidelines. Please edit and try again."
        );
        setIsPostingComment(false);
        return;
      }
      await postVideoComment(videoId, trimmed, token);
      setCommentDraft("");

      // Refetch comments (page 1) after posting and reset pagination
      await refreshComments();
    } catch (error) {
      setCommentsError("Failed to post comment. Please try again.");
      // Don't clear the draft on error so user can retry
    } finally {
      setIsPostingComment(false);
    }
  }, [commentDraft, videoId, token, refreshComments]);

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
        token: token ?? undefined,
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

  const toggleLikeComment = useCallback(
    async (commentId: string | number) => {
      if (!token || !videoId) return;

      const idStr = String(commentId);
      if (likingCommentId === idStr) return; // Prevent double-clicks

      setLikingCommentId(idStr);
      const wasLiked = likedCommentIds.has(idStr);

      try {
        // Optimistic update
        setLikedCommentIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.delete(idStr);
          else next.add(idStr);
          return next;
        });

        setComments((prevComments) =>
          prevComments.map((c) => {
            if (String(c.id) !== idStr) return c;
            return {
              ...c,
              likes: wasLiked
                ? Math.max(0, (c.likes || 0) - 1)
                : (c.likes || 0) + 1,
            };
          })
        );

        // Post to server
        const response = await postCommentReaction(
          videoId,
          commentId,
          wasLiked ? "remove" : "like",
          token
        );

        // Update with server response
        if (response?.data?.likes !== undefined) {
          setComments((prevComments) =>
            prevComments.map((c) => {
              if (String(c.id) !== idStr) return c;
              return { ...c, likes: response.data.likes };
            })
          );
        }
      } catch (error) {
        // Revert on error
        setLikedCommentIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(idStr);
          else next.delete(idStr);
          return next;
        });

        setComments((prevComments) =>
          prevComments.map((c) => {
            if (String(c.id) !== idStr) return c;
            return {
              ...c,
              likes: wasLiked
                ? (c.likes || 0) + 1
                : Math.max(0, (c.likes || 0) - 1),
            };
          })
        );

        if (__DEV__) console.warn("Failed to toggle comment like:", error);
      } finally {
        setLikingCommentId(null);
      }
    },
    [token, videoId, likedCommentIds, likingCommentId]
  );

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

  const handleFullscreenUpdate = useCallback(
    async (event: { fullscreenUpdate: number }) => {
      // This is now unused as we use custom modal fullscreen
      // Keeping for compatibility with PlayerVideoContainer
    },
    []
  );

  const handleEnterFullscreen = useCallback(async () => {
    if (!isLoaded) {
      return;
    }
    registerInteraction();

    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
      StatusBar.setHidden(true, "fade");
    } catch (error) {
      console.error("Failed to lock orientation:", error);
    }

    setIsFullscreen(true);
    try {
      setFullscreen(true);
    } catch (e) {
      // ignore if context not available
    }
  }, [isLoaded, registerInteraction]);

  const handleExitFullscreen = useCallback(async () => {
    registerInteraction();

    try {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
      StatusBar.setHidden(false, "fade");
    } catch (error) {
      console.error("Failed to restore orientation:", error);
    }
    setIsFullscreen(false);
    try {
      setFullscreen(false);
    } catch (e) {
      // ignore if context not available
    }
  }, [registerInteraction]);

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

  const fullscreenStyles = useMemo(() => {
    if (!isFullscreen) return styles;

    return {
      ...styles,
      videoContainer: {
        position: "absolute" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
        zIndex: 9999,
      },
      video: {
        width: "100%",
        height: "100%",
      },
      controlsContainer: {
        ...StyleSheet.flatten(styles.controlsContainer),
        paddingHorizontal: 40,
      },
    };
  }, [isFullscreen]);

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle={Platform.OS === "android" ? "light-content" : "default"}
        backgroundColor="#000"
      />

      <PlayerVideoContainer
        styles={fullscreenStyles}
        resolvedUri={resolvedUri}
        poster={poster}
        videoRef={videoRef}
        handleStatusUpdate={handleStatusUpdate}
        handleFullscreenUpdate={handleFullscreenUpdate}
        handleLoadStart={handleLoadStart}
        handleLoad={handleLoad}
        handleError={handleError}
        isBuffering={isBuffering}
        bufferInfo={bufferInfo}
        durationMillis={durationMillis}
        positionMillis={positionMillis}
        isLoaded={isLoaded}
        isPlaying={isPlaying}
        hasFinished={hasFinished}
        controlsVisible={controlsVisible}
        controlsOpacity={controlsOpacity}
        handleHideControls={handleHideControls}
        handleShowControls={handleShowControls}
        displayTitle={displayTitle}
        handleSeek={handleSeek}
        handleTogglePlay={handleTogglePlay}
        handleSeekTo={handleSeekTo}
        handleSlidingStart={handleSlidingStart}
        handleSlidingComplete={handleSlidingComplete}
        handleSliderValueChange={handleSliderValueChange}
        handleEnterFullscreen={handleEnterFullscreen}
        handleExitFullscreen={handleExitFullscreen}
        handleClose={() => router.back()}
        handleReplay={handleReplay}
        isFullscreen={isFullscreen}
      />

      {!isFullscreen && (
        <>
          <PlayerDetails
            styles={styles}
            displayTitle={displayTitle}
            likes={likes}
            dislikes={dislikes}
            isLiked={isLiked}
            isDisliked={isDisliked}
            isSaved={isSaved}
            handleLikePress={handleLikePress}
            handleDislikePress={handleDislikePress}
            handleSavePress={handleSavePress}
            handleReportPress={handleReportPress}
            handleBlockPress={handleBlockPress}
            likesError={likesError}
            comments={comments}
            commentDraft={commentDraft}
            setCommentDraft={setCommentDraft}
            handleSubmitComment={handleSubmitComment}
            commentsError={commentsError}
            isLoadingComments={isLoadingComments}
            isPostingComment={isPostingComment}
            isLoadingMoreComments={isLoadingMoreComments}
            loadMoreComments={loadMoreComments}
            toggleLikeComment={toggleLikeComment}
            likedCommentIds={likedCommentIds}
            likingCommentId={likingCommentId}
            resolveAvatarUri={resolveAvatarUri}
            token={token}
          />

          <ReportModal
            visible={reportModalVisible}
            onClose={() => {
              setReportModalVisible(false);
              setReportingCommentId(null);
              setReportingUserId(null);
            }}
            videoId={videoId ?? null}
            commentId={reportingCommentId}
            userId={reportingUserId}
            currentUserId={user?.id?.toString() ?? null}
            token={token ?? null}
            onSuccess={() => {
              setReportModalVisible(false);
              setReportingCommentId(null);
              setReportingUserId(null);
            }}
          />

          <BlockContentModal
            visible={blockModalVisible}
            onClose={() => {
              setBlockModalVisible(false);
            }}
            videoId={videoId ?? null}
            creatorId={null}
            token={token ?? null}
            onSuccess={() => {
              setBlockModalVisible(false);
              router.back();
            }}
          />
        </>
      )}
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
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
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
    fontWeight: "700",
    marginBottom: 18,
    lineHeight: 28,
    letterSpacing: 0.3,
  },
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  socialButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 76,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  socialButtonActive: {
    backgroundColor: "rgba(14,165,233,0.2)",
    borderColor: "rgba(14,165,233,0.3)",
  },
  socialLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  socialCount: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 3,
    fontWeight: "500",
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 16,
    marginTop: 8,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.2,
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
  commentListWrapper: {
    maxHeight: 300,
  },
  commentsKeyboardAvoid: {
    width: "100%",
  },
  commentBubble: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
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
    color: "#f9fafb",
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
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
  emptyCommentsAction: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 12,
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
