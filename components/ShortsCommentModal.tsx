import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
} from "react-native";

import { HeartIcon, ReportIcon } from "@/components/shorts/Icons";
import {
  VideoComment,
  fetchVideoComments,
  postCommentReaction,
  postVideoComment,
} from "@/lib/api/video-interactions";

function resolveAvatarUri(avatar?: string): string | undefined {
  if (!avatar) return undefined;
  const trimmed = avatar.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Fallback to placeholder path handled by server; keep simple
  return `https://api.arewaflix.io/${trimmed.replace(/^\/+/, "")}`;
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
  onClose: () => void;
  onReport: (videoId?: string, commentId?: string) => void;
};

export default function ShortsCommentModal({
  visible,
  videoId,
  token,
  onClose,
  onReport,
}: Props) {
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

  const COMMENTS_PAGE_LIMIT = 20;

  const loadComments = useCallback(
    async (page = 1) => {
      if (!videoId) return;
      setIsLoadingComments(true);
      setCommentsError(null);
      try {
        const resp = await fetchVideoComments(videoId, {
          page,
          limit: COMMENTS_PAGE_LIMIT,
        });
        if (page === 1) setComments(resp.data || []);
        else setComments((prev) => [...prev, ...(resp.data || [])]);
        setCommentsPage(resp.pagination?.page ?? page);
        setCommentsTotalPages(resp.pagination?.totalPages ?? 1);
      } catch (err) {
        setCommentsError("Failed to load comments.");
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
      });
      setComments((prev) => [...prev, ...(resp.data || [])]);
      setCommentsPage(resp.pagination?.page ?? nextPage);
      setCommentsTotalPages(resp.pagination?.totalPages ?? commentsTotalPages);
    } catch (err) {
      setCommentsError("Failed to load more comments.");
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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={modalStyles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={60}
      >
        <View style={modalStyles.modalHeader}>
          <Text style={modalStyles.modalTitle}>
            Comments ({comments.length})
          </Text>
          <Pressable onPress={onClose} style={modalStyles.closeButton}>
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
                  if (videoId) {
                    setCommentsError(null);
                    void loadComments(1);
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
                  if (videoId) {
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

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        marginTop: 8,
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Pressable
                        onPress={() => toggleLikeComment(item.id)}
                        disabled={!token || likingCommentId === String(item.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          padding: 6,
                          opacity:
                            !token || likingCommentId === String(item.id)
                              ? 0.5
                              : 1,
                        }}
                      >
                        <HeartIcon
                          size={18}
                          color={
                            likedCommentIds.has(String(item.id))
                              ? "#ff2d55"
                              : "#fff"
                          }
                        />
                        <Text
                          style={{ color: "#fff", fontSize: 12, marginLeft: 6 }}
                        >
                          {item.likes ?? 0}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          onReport(videoId ?? undefined, String(item.id))
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 8,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          backgroundColor: "transparent",
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Report comment"
                      >
                        <ReportIcon size={20} color="#ff3b30" />
                        <Text
                          style={{
                            color: "#ff3b30",
                            fontSize: 13,
                            fontWeight: "700",
                            marginLeft: 10,
                          }}
                        >
                          Report
                        </Text>
                      </Pressable>
                    </View>
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
  );
}
