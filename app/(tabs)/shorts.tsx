import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
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
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ReportModal from "@/components/ReportModal";
import ShortPlayerCard from "@/components/ShortPlayerCard";
import ShortsCommentModal from "@/components/ShortsCommentModal";
import { useAuth } from "@/context/AuthContext";
// comment modal logic moved to components/ShortsCommentModal.tsx
import {
  Video as VideoModel,
  fetchShorts,
  getVideosErrorMessage,
} from "@/lib/api/videos";
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
// Avatar resolution logic moved into comment modal component

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

/* Icons moved to components/shorts/Icons.tsx */

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

/* Comment modal styles moved into `components/ShortsCommentModal.tsx` */

/* ShortPlayerCard implementation moved to components/ShortPlayerCard.tsx */

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

  // Report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingVideoId, setReportingVideoId] = useState<string | null>(null);

  const COMMENTS_PAGE_LIMIT = 20;

  const requestRef = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Handle opening comment modal (data fetching moved to ShortsCommentModal)
  const handleOpenComments = useCallback((videoId: string) => {
    setSelectedVideoId(videoId);
    setCommentModalVisible(true);
  }, []);

  // Handle closing comment modal
  const handleCloseComments = useCallback(() => {
    setCommentModalVisible(false);
    setSelectedVideoId(null);
  }, []);

  // Handle opening report modal (for video reports only)
  const handleReport = useCallback((videoId?: string, commentId?: string) => {
    // Comment reports are now handled inside ShortsCommentModal
    if (commentId) return;
    setReportingVideoId(videoId ?? null);
    setReportModalVisible(true);
  }, []);

  // Lower threshold to make activation a bit more permissive for shorter screens,
  // and add logging to help trace active index changes during debugging.
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const firstVisible = viewableItems.find(
        (item) => typeof item.index === "number"
      );
      if (firstVisible && typeof firstVisible.index === "number") {
        setActiveIndex(firstVisible.index);
      }
    },
    []
  );

  const hydrateShorts = useCallback(
    async (videos: VideoModel[], signal?: AbortSignal) => {
      const playable: PlayableShort[] = [];
      let unsupported = 0;

      try {
        for (const video of videos) {
          if (signal?.aborted) break;

          try {
            const { media, short } = resolveShortMedia(video);

            if (short.kind === "video") {
              playable.push({
                video,
                source: { uri: short.uri, origin: "direct" },
              });
            } else {
              // Non-direct media are unsupported for Shorts
              unsupported += 1;
            }
          } catch (error) {
            if (__DEV__) console.warn("Failed to resolve short media:", error);
            unsupported += 1;
          }
        }
      } catch (error) {
        if (__DEV__) console.warn("Error hydrating shorts:", error);
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

        // Better network error detection
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isNetworkError =
          errorMessage.toLowerCase().includes("network") ||
          errorMessage.toLowerCase().includes("failed to fetch") ||
          errorMessage.toLowerCase().includes("connection") ||
          err instanceof TypeError;

        setError(
          isNetworkError
            ? "Network connection failed. Please check your internet and try again."
            : getVideosErrorMessage(err)
        );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Cleanup function to ensure proper unmounting
  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

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
    ({ item, index }: { item: PlayableShort; index: number }) => {
      const isItemActive = isFocused && index === activeIndex;

      return (
        <View style={{ height: itemHeight, width: "100%" }}>
          <ShortPlayerCard
            item={item}
            isActive={isItemActive}
            topInset={insets.top}
            bottomInset={insets.bottom}
            onOpenComments={handleOpenComments}
            onReport={handleReport}
          />
        </View>
      );
    },
    [
      activeIndex,
      insets.bottom,
      insets.top,
      isFocused,
      itemHeight,
      handleOpenComments,
      handleReport,
    ]
  );

  const keyExtractor = useCallback(
    (item: PlayableShort, index: number) => `${item.video.id}-${index}`,
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight]
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
    const errStr = typeof error === "string" ? error : String(error ?? "");
    const is429Error =
      errStr.toLowerCase().includes("429") ||
      errStr.toLowerCase().includes("rate limit");
    const isNetworkError =
      errStr.toLowerCase().includes("network") ||
      errStr.toLowerCase().includes("connection");

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
              : errStr}
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
      {/* Network error dialog: appears when a network-related error occurs */}
      {(() => {
        const errStrGlobal =
          typeof error === "string" ? error : String(error ?? "");
        const showNetworkModal =
          Boolean(errStrGlobal) &&
          /network|connection|request failed/i.test(errStrGlobal) &&
          !loading;

        if (!showNetworkModal) return null;

        return (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setError(null)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.6)",
                justifyContent: "center",
                alignItems: "center",
                padding: 20,
              }}
            >
              <View
                style={{
                  width: "100%",
                  maxWidth: 420,
                  backgroundColor: "#1a1a1a",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: "600",
                    marginBottom: 8,
                  }}
                >
                  Network Problem
                </Text>
                <Text style={{ color: "#ccc", fontSize: 14, marginBottom: 16 }}>
                  {errStrGlobal}
                </Text>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    onPress={() => {
                      // retry
                      setError(null);
                      void loadShorts(true);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: "#ff0055",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                    >
                      Try Again
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setError(null)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 8,
                      backgroundColor: "rgba(255,255,255,0.08)",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}
                    >
                      Dismiss
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        );
      })()}
      {/* Dev-only overlay removed — was showing active index and source URI */}
      <FlatList
        ref={flatListRef}
        data={shorts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={getItemLayout}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={Platform.OS === "android"}
        updateCellsBatchingPeriod={100}
        scrollEventThrottle={16}
        overScrollMode="never"
        bounces={false}
        keyboardShouldPersistTaps="never"
        keyboardDismissMode="on-drag"
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

      {/* Comment Modal (extracted to component) */}
      <ShortsCommentModal
        visible={commentModalVisible}
        videoId={selectedVideoId}
        token={token}
        onClose={handleCloseComments}
      />

      {/* Report Modal - now only for video reports */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setReportingVideoId(null);
        }}
        videoId={reportingVideoId}
        token={token}
        onSuccess={() => {
          setReportModalVisible(false);
          setReportingVideoId(null);
        }}
      />
    </View>
  );
}
