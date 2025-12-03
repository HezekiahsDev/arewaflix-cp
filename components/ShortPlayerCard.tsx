import { Ionicons } from "@expo/vector-icons";
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
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Utility: quick availability check for video URL to help diagnose iOS errors
async function checkUrlAvailability(uri: string) {
  try {
    // Use HEAD where possible to avoid downloading body
    const res = await fetch(uri, { method: "HEAD" });
    return {
      ok: res.ok,
      status: res.status,
      redirected: res.redirected,
      url: res.url,
      headers: Object.fromEntries((res.headers as any)?.entries?.() || []),
    };
  } catch (err) {
    throw err;
  }
}

import {
  CommentIcon,
  HeartIcon,
  VolumeIcon,
  VolumeOffIcon,
} from "@/components/shorts/Icons";
import { useAuth } from "@/context/AuthContext";
import {
  fetchUserReaction,
  fetchVideoComments,
  fetchVideoLikes,
  postVideoReaction,
  VideoComment,
} from "@/lib/api/video-interactions";
import { Video as VideoModel } from "@/lib/api/videos";
import { getDurationLabel } from "@/lib/videos/formatters";

type PlayableShort = {
  video: VideoModel;
  source: {
    uri: string;
    origin: "direct";
  };
};

type ShortPlayerCardProps = {
  item: PlayableShort;
  isActive: boolean;
  topInset: number;
  bottomInset: number;
  onOpenComments: (videoId: string) => void;
  onReport: (videoId: string) => void;
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

export default React.memo(
  function ShortPlayerCard({
    item,
    isActive,
    topInset,
    bottomInset,
    onOpenComments,
    onReport,
  }: ShortPlayerCardProps) {
    const { user, token } = useAuth();
    const videoRef = useRef<ExpoVideo | null>(null);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState<boolean>(Platform.OS === "web");
    const [isPlayingLocal, setIsPlayingLocal] = useState<boolean>(false);
    const [reloadKey, setReloadKey] = useState<number>(0);
    const [progress, setProgress] = useState<number>(0);
    const [timeRemainingLabel, setTimeRemainingLabel] = useState<string | null>(
      null
    );

    const [likes, setLikes] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [comments, setComments] = useState<VideoComment[]>([]);
    const [isLoadingLikes, setIsLoadingLikes] = useState(false);
    const [isPostingReaction, setIsPostingReaction] = useState(false);

    const lastTap = useRef<number>(0);
    const doubleTapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const likeAnimationScale = useRef(new Animated.Value(0)).current;

    const centerAnim = useRef(new Animated.Value(1)).current;
    const [centerTouchable, setCenterTouchable] = useState(true);
    const centerHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );
    const CENTER_HIDE_DELAY = 1500;

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

    const lastProgressUpdateTs = useRef<number>(0);
    const lastProgressPct = useRef<number>(-1);

    const videoId = item.video.id;
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
      if (!isActive || !videoId) return;

      // Abort any pending requests from this component
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const loadInteractions = async () => {
        setIsLoadingLikes(true);
        try {
          const likesResp = await fetchVideoLikes(videoId, controller.signal);
          if (controller.signal.aborted) return;
          setLikes(likesResp.data.likes || 0);

          if (token) {
            const reactionResp = await fetchUserReaction(
              videoId,
              token,
              controller.signal
            );
            if (controller.signal.aborted) return;
            setIsLiked(reactionResp.data.reaction === 1);
          }

          const commentsResp = await fetchVideoComments(videoId, {
            page: 1,
            limit: 1,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
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
      if (!videoId || !token || isPostingReaction) return;
      setIsPostingReaction(true);
      try {
        const response = await postVideoReaction(videoId, "like", token);
        if (response?.data?.likes !== undefined) setLikes(response.data.likes);
        try {
          const likesResp = await fetchVideoLikes(videoId);
          setLikes(likesResp?.data?.likes ?? response?.data?.likes ?? 0);
        } catch (refreshErr) {
          if (__DEV__) console.warn("Failed to refresh likes:", refreshErr);
        }
        setIsLiked((prev) => !prev);
      } catch (error) {
        if (__DEV__) console.warn("Failed to update reaction:", error);
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
        lastTap.current = 0;
        if (!isLiked && token) {
          animateLike();
          handleLikePress();
        }
      } else {
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

      let isMounted = true;

      const updatePlayback = async () => {
        try {
          if (!isMounted) return;

          if (isActive && !hasError) {
            if (player.setIsMutedAsync) {
              await player.setIsMutedAsync(isMuted).catch(() => {});
            }
            if (isMounted) {
              await player.playAsync().catch(() => {});
            }
          } else {
            await player.pauseAsync().catch(() => {});
          }
        } catch (error) {
          // Silent catch - component may have unmounted
        }
      };

      updatePlayback();

      return () => {
        isMounted = false;
      };
    }, [isActive, hasError, isMuted, item.source]);

    useEffect(() => {
      showCenterButton();
      return () => {
        if (centerHideTimeout.current) {
          clearTimeout(centerHideTimeout.current);
          centerHideTimeout.current = null;
        }
        if (doubleTapTimeout.current) {
          clearTimeout(doubleTapTimeout.current);
          doubleTapTimeout.current = null;
        }
        // Cleanup video ref on unmount
        const player = videoRef.current;
        if (player) {
          player.pauseAsync().catch(() => {});
          player.unloadAsync?.().catch(() => {});
        }
      };
    }, []);

    useEffect(() => {
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
      if (isPlayingLocal) showCenterButton();
      else {
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
        if (s.isLoaded === false) {
          if (s.error)
            setHasError(
              typeof s.error === "string" ? s.error : "Unable to load video"
            );
          setIsBuffering(Boolean(s.isBuffering));
          setIsPlayingLocal(Boolean(s.isPlaying));
          return;
        }
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

    const handleError = useCallback(
      (err: unknown) => {
        if (__DEV__) console.warn("Video onError", err);

        // Try a lightweight availability check to surface HTTP/TLS/redirect problems
        (async () => {
          try {
            const info = await checkUrlAvailability(item.source.uri);
            if (__DEV__) console.warn("Video URL availability:", info);
          } catch (e) {
            if (__DEV__) console.warn("Video URL check failed:", e);
          }
        })();

        setHasError("Playback error");
      },
      [item.source.uri]
    );

    const togglePlayPause = useCallback(() => {
      const player = videoRef.current;
      if (!player) return;
      if (isPlayingLocal)
        void player
          .pauseAsync()
          .then(() => setIsPlayingLocal(false))
          .catch(() => {});
      else
        void player
          .playAsync()
          .then(() => setIsPlayingLocal(true))
          .catch(() => {});
      try {
        showCenterButton();
      } catch (e) {}
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
          delayLongPress={500}
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
                    setHasError(null);
                    setIsBuffering(true);
                    try {
                      void videoRef.current?.unloadAsync?.();
                    } catch (e) {}
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
            accessibilityRole="button"
            accessibilityLabel={`View comments (${commentsCount})`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <CommentIcon size={30} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>
              {commentsCount}
            </Text>
          </Pressable>

          <Pressable
            style={{ alignItems: "center", marginBottom: 18 }}
            onPress={() => onReport(videoId)}
          >
            <Ionicons name="flag-outline" size={26} color="#ff3b30" />
            <Text style={{ color: "#fff", fontSize: 12, marginTop: 6 }}>
              Report
            </Text>
          </Pressable>
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
  (prev, next) =>
    prev.isActive === next.isActive &&
    prev.item.video.id === next.item.video.id &&
    prev.item.source.uri === next.item.source.uri &&
    prev.topInset === next.topInset &&
    prev.bottomInset === next.bottomInset &&
    prev.onOpenComments === next.onOpenComments &&
    prev.onReport === next.onReport
);
