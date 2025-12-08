import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import CommentItem from "@/components/player/CommentItem";
import ReportModal from "@/components/ReportModal";
import {
  ApiError,
  VideoComment,
  fetchCommentReaction,
  fetchVideoComments,
  postCommentReaction,
  postVideoComment,
} from "@/lib/api/video-interactions";
import { useRouter } from "expo-router";

const CDN_BASE_URL = "https://arewaflix.s3.us-east-005.backblazeb2.com/";

function resolveAvatarUri(avatar?: string): string {
  if (!avatar) return "https://via.placeholder.com/32x32/666666/ffffff?text=U";
  const trimmed = avatar.trim();
  if (!trimmed) return "https://via.placeholder.com/32x32/666666/ffffff?text=U";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Check if this looks like a CDN path (contains "upload/photos")
  const sanitized = trimmed.replace(/^\/+/, "");
  if (sanitized.includes("upload/photos")) {
    return `${CDN_BASE_URL}${encodeURI(sanitized)}`;
  }

  // Fallback to API base URL for other paths
  return `https://api.arewaflix.io/${sanitized}`;
}

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
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
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
  errorBannerText: { flex: 1, color: "#fbbf24", fontSize: 13, lineHeight: 18 },
  retryButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  commentList: { gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
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
  commentHeaderInfo: { flex: 1 },
  commentUserRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentUsername: { color: "#fff", fontSize: 14, fontWeight: "600" },
  verifiedBadge: { marginLeft: 2 },
  commentTime: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 },
  commentText: { color: "#fff", fontSize: 14, lineHeight: 20 },
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
  commentButtonDisabled: { backgroundColor: "rgba(255,255,255,0.2)" },
  commentButtonText: { color: "#000", fontSize: 14, fontWeight: "700" },
  loginPrompt: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
  },
  loginPromptText: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
});

type Props = {
  visible: boolean;
  videoId: string | null;
  token: string | null | undefined;
  currentUserId: string | null;
  onClose: () => void;
};

export default function ShortsCommentModal({
  visible,
  videoId,
  token,
  currentUserId,
  onClose,
}: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState(1);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);

  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(
    new Set()
  );
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);

  // Report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(
    null
  );
  const [reportingUserId, setReportingUserId] = useState<string | null>(null);

  const COMMENTS_PAGE_LIMIT = 20;

  const needsLogin = commentsError === "Please login to view comments.";

  const loadComments = useCallback(
    async (page = 1) => {
      if (!videoId) return;
      setIsLoadingComments(true);
      setCommentsError(null);
      try {
        const resp = await fetchVideoComments(videoId, {
          page,
          limit: COMMENTS_PAGE_LIMIT,
          token: token ?? undefined,
        });
        if (page === 1) setComments(resp.data || []);
        else setComments((prev) => [...prev, ...(resp.data || [])]);
        setCommentsPage(resp.pagination?.page ?? page);
        setCommentsTotalPages(resp.pagination?.totalPages ?? 1);
        // After loading comments, fetch per-comment user reaction if authenticated
        if (token && resp.data && resp.data.length) {
          const reactions = await Promise.all(
            resp.data.map(async (c) => {
              try {
                const r = await fetchCommentReaction(videoId, c.id, token);
                return {
                  id: String(c.id),
                  reaction: r?.data?.reaction ?? null,
                };
              } catch (e) {
                return { id: String(c.id), reaction: null };
              }
            })
          );

          setLikedCommentIds((prev) => {
            const next = new Set(prev);
            for (const r of reactions) {
              if (r.reaction === "like") next.add(r.id);
              else next.delete(r.id);
            }
            return next;
          });
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setCommentsError("Please login to view comments.");
          } else if (err.status === 502) {
            setCommentsError(
              "Comments service temporarily unavailable. Please try again later."
            );
          } else {
            setCommentsError("Failed to load comments.");
          }
        } else {
          setCommentsError("Failed to load comments.");
        }
      } finally {
        setIsLoadingComments(false);
      }
    },
    [videoId]
  );

  useEffect(() => {
    if (visible && videoId) {
      void loadComments(1);
    }
  }, [visible, videoId, loadComments]);

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
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setCommentsError("Please login to view comments.");
        } else if (err.status === 502) {
          setCommentsError(
            "Comments service temporarily unavailable. Please try again later."
          );
        } else {
          setCommentsError("Failed to load more comments.");
        }
      } else {
        setCommentsError("Failed to load more comments.");
      }
    } finally {
      setIsLoadingMoreComments(false);
    }
  }, [videoId, commentsPage, commentsTotalPages, isLoadingMoreComments]);

  const toggleLikeComment = useCallback(
    async (commentId: string | number) => {
      if (!token || !videoId) return;
      const idStr = String(commentId);
      if (likingCommentId === idStr) return;
      setLikingCommentId(idStr);
      const wasLiked = likedCommentIds.has(idStr);
      try {
        setLikedCommentIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.delete(idStr);
          else next.add(idStr);
          return next;
        });
        setComments((prevComments) =>
          prevComments.map((c) =>
            String(c.id) !== idStr
              ? c
              : {
                  ...c,
                  likes: wasLiked
                    ? Math.max(0, (c.likes || 0) - 1)
                    : (c.likes || 0) + 1,
                }
          )
        );
        const response = await postCommentReaction(
          videoId,
          commentId,
          wasLiked ? "remove" : "like",
          token
        );
        if (response?.data?.likes !== undefined) {
          setComments((prevComments) =>
            prevComments.map((c) =>
              String(c.id) !== idStr ? c : { ...c, likes: response.data.likes }
            )
          );
        }
      } catch (err) {
        setLikedCommentIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(idStr);
          else next.delete(idStr);
          return next;
        });
        setComments((prevComments) =>
          prevComments.map((c) =>
            String(c.id) !== idStr
              ? c
              : {
                  ...c,
                  likes: wasLiked
                    ? (c.likes || 0) + 1
                    : Math.max(0, (c.likes || 0) - 1),
                }
          )
        );
        if (__DEV__) console.warn("Failed to toggle comment like:", err);
      } finally {
        setLikingCommentId(null);
      }
    },
    [token, videoId, likedCommentIds, likingCommentId]
  );

  const handleSubmitComment = useCallback(async () => {
    const trimmed = commentDraft.trim();
    if (!trimmed.length || !videoId || !token) return;
    Keyboard.dismiss();
    setIsPostingComment(true);
    setCommentsError(null);
    try {
      await postVideoComment(videoId, trimmed, token);
      setCommentDraft("");
      await loadComments(1);
    } catch (err) {
      setCommentsError("Failed to post comment. Please try again.");
    } finally {
      setIsPostingComment(false);
    }
  }, [commentDraft, videoId, token, loadComments]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={
        Platform.OS === "ios" ? "fullScreen" : "overFullScreen"
      }
      onRequestClose={onClose}
      onShow={() => {
        // Reset any focus issues when modal shows
        if (Platform.OS === "ios") {
          setTimeout(() => {
            // Force a layout update
          }, 100);
        }
      }}
      onDismiss={() => {
        // Clean up when modal is dismissed
        Keyboard.dismiss();
        if (Platform.OS === "ios") {
          setTimeout(() => {
            // Allow parent component to regain focus
          }, 100);
        }
      }}
    >
      <KeyboardAvoidingView
        style={modalStyles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 60}
      >
        <View
          style={[
            modalStyles.modalHeader,
            { paddingTop: Platform.OS === "ios" ? 44 : 16 },
          ]}
        >
          <Text style={modalStyles.modalTitle}>
            Comments ({comments.length})
          </Text>
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              // Small delay to ensure keyboard dismissal completes
              setTimeout(
                () => {
                  onClose();
                },
                Platform.OS === "ios" ? 150 : 50
              );
            }}
            style={modalStyles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>

        <View style={{ flex: 1 }}>
          {commentsError && (
            <View style={modalStyles.errorBanner}>
              <Ionicons name="warning-outline" size={18} color="#f59e0b" />
              <Text style={modalStyles.errorBannerText}>{commentsError}</Text>
              <Pressable
                onPress={() => {
                  if (needsLogin) {
                    setCommentsError(null);
                    onClose();
                    router.push("/auth/login");
                  } else if (videoId) {
                    setCommentsError(null);
                    void loadComments(1);
                  }
                }}
                style={modalStyles.retryButton}
              >
                <Ionicons
                  name={needsLogin ? "log-in" : "refresh"}
                  size={16}
                  color="#fff"
                />
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
                name={needsLogin ? "person-circle" : "cloud-offline-outline"}
                size={64}
                color="rgba(255,255,255,0.3)"
              />
              <Text
                style={[
                  modalStyles.emptyText,
                  { marginTop: 16, fontSize: 16, fontWeight: "600" },
                ]}
              >
                {needsLogin
                  ? "Sign in to view comments"
                  : "Unable to load comments"}
              </Text>
              <Text style={[modalStyles.emptyText, { marginTop: 8 }]}>
                {needsLogin
                  ? "You must be signed in to view and post comments."
                  : "Please check your connection"}
              </Text>
              <Pressable
                onPress={() => {
                  if (needsLogin) {
                    setCommentsError(null);
                    onClose();
                    router.push("/auth/login");
                  } else if (videoId) {
                    setCommentsError(null);
                    void loadComments(1);
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
                <Ionicons
                  name={needsLogin ? "log-in" : "refresh"}
                  size={18}
                  color="#fff"
                />
                <Text
                  style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}
                >
                  {needsLogin ? "Sign In" : "Try Again"}
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
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={
                isLoadingMoreComments ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    style={{ marginVertical: 16 }}
                  />
                ) : null
              }
              renderItem={({ item }) => (
                <CommentItem
                  comment={item}
                  isLiked={likedCommentIds.has(String(item.id))}
                  onLikePress={toggleLikeComment}
                  onReportPress={(commentId, userId) => {
                    setReportingCommentId(commentId);
                    setReportingUserId(userId);
                    setReportModalVisible(true);
                  }}
                  disabled={!token || likingCommentId === String(item.id)}
                  resolveAvatarUri={resolveAvatarUri}
                  styles={{
                    commentBubble: modalStyles.commentBubble,
                    commentHeader: modalStyles.commentHeader,
                    commentAvatar: modalStyles.commentAvatar,
                    commentHeaderInfo: modalStyles.commentHeaderInfo,
                    commentUserRow: modalStyles.commentUserRow,
                    commentUsername: modalStyles.commentUsername,
                    verifiedBadge: modalStyles.verifiedBadge,
                    commentTime: modalStyles.commentTime,
                    commentText: modalStyles.commentText,
                  }}
                />
              )}
            />
          ) : (
            <View style={modalStyles.emptyContainer}>
              <Text style={modalStyles.emptyText}>
                No comments yet. Be the first to comment!
              </Text>
            </View>
          )}
        </View>

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

      {/* Report Modal for comment reports */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setReportingCommentId(null);
          setReportingUserId(null);
        }}
        videoId={videoId}
        commentId={reportingCommentId}
        userId={reportingUserId}
        currentUserId={currentUserId}
        token={token}
        onSuccess={() => {
          setReportModalVisible(false);
          setReportingCommentId(null);
          setReportingUserId(null);
        }}
      />
    </Modal>
  );
}
