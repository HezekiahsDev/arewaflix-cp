import OptionsMenu from "@/components/ui/OptionsMenu";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CommentItem from "./player/CommentItem";
import SocialButton from "./player/SocialButton";

const PlayerDetails = memo(function PlayerDetails(props: any) {
  const {
    styles,
    displayTitle,
    likes,
    dislikes,
    isLiked,
    isDisliked,
    isSaved,
    handleLikePress,
    handleDislikePress,
    handleSavePress,
    handleReportPress,
    handleBlockPress,
    likesError,
    comments,
    commentDraft,
    setCommentDraft,
    handleSubmitComment,
    commentsError,
    isLoadingComments,
    isPostingComment,
    isLoadingMoreComments,
    loadMoreComments,
    toggleLikeComment,
    likedCommentIds,
    likingCommentId,
    resolveAvatarUri,
    token,
  } = props;

  const router = useRouter();
  const [showOptions, setShowOptions] = useState(false);

  // Memoize login check
  const needsLogin = useMemo(
    () => commentsError === "Please login to view comments.",
    [commentsError]
  );

  // Helper to ensure user is authenticated before performing an action
  const ensureAuth = useCallback(
    (fn?: (...args: any[]) => void) => {
      return (...args: any[]) => {
        if (!token) {
          router.push("/auth/login");
          return;
        }
        fn?.(...args);
      };
    },
    [token, router]
  );

  // Memoize menu items to prevent unnecessary re-renders
  const menuItems = useMemo(
    () => [
      {
        key: "report",
        label: "Report",
        icon: "flag-outline" as const,
        onPress: () => ensureAuth(() => handleReportPress?.())(),
      },
      {
        key: "block",
        label: "Block",
        icon: "ban-outline" as const,
        destructive: true,
        onPress: () => ensureAuth(() => handleBlockPress?.())(),
      },
    ],
    [ensureAuth, handleReportPress, handleBlockPress]
  );

  // Callbacks used by the comments list — defined unconditionally so hook
  // invocation order stays consistent across renders and we don't trigger
  // "rendered more hooks than during the previous render" when
  // `comments.length` changes.
  const keyExtractor = useCallback((item: any) => `comment-${item.id}`, []);

  const renderCommentItem = useCallback(
    ({ item }: any) => (
      <CommentItem
        comment={item}
        isLiked={likedCommentIds.has(String(item.id))}
        onLikePress={toggleLikeComment}
        onReportPress={(cid: string, uid: string) => {
          if (!token) {
            router.push("/auth/login");
            return;
          }
          handleReportPress?.(cid, uid);
        }}
        disabled={likingCommentId === String(item.id)}
        resolveAvatarUri={resolveAvatarUri}
        styles={styles}
      />
    ),
    [
      likedCommentIds,
      toggleLikeComment,
      handleReportPress,
      resolveAvatarUri,
      styles,
      token,
      router,
      likingCommentId,
    ]
  );

  const handleEndReached = useCallback(() => {
    loadMoreComments();
  }, [loadMoreComments]);

  return (
    <View style={styles.detailsContainer}>
      <Text style={styles.title}>{displayTitle}</Text>
      <View style={styles.socialRow}>
        <SocialButton
          icon="heart-outline"
          activeIcon="heart"
          label={isLiked ? "Liked" : "Like"}
          count={likes}
          isActive={isLiked}
          onPress={ensureAuth(handleLikePress)}
          style={styles.socialButton}
          activeStyle={styles.socialButtonActive}
          labelStyle={styles.socialLabel}
          countStyle={styles.socialCount}
          activeIconColor="#ff3b30"
        />

        <SocialButton
          icon="thumbs-down-outline"
          activeIcon="thumbs-down"
          label={isDisliked ? "Disliked" : "Dislike"}
          count={dislikes}
          isActive={isDisliked}
          onPress={ensureAuth(handleDislikePress)}
          style={styles.socialButton}
          activeStyle={styles.socialButtonActive}
          labelStyle={styles.socialLabel}
          countStyle={styles.socialCount}
          activeIconColor="#ff3b30"
        />

        <SocialButton
          icon="bookmark-outline"
          activeIcon="bookmark"
          label={isSaved ? "Saved" : "Save"}
          isActive={isSaved}
          onPress={ensureAuth(handleSavePress)}
          style={styles.socialButton}
          activeStyle={styles.socialButtonActive}
          labelStyle={styles.socialLabel}
          activeIconColor="#007AFF"
        />

        <SocialButton
          icon="ellipsis-vertical"
          label="More"
          onPress={useCallback(() => setShowOptions(true), [])}
          style={styles.socialButton}
          labelStyle={styles.socialLabel}
        />
      </View>

      <OptionsMenu
        visible={showOptions}
        onClose={useCallback(() => setShowOptions(false), [])}
        items={menuItems}
      />

      {likesError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#f59e0b" />
          <Text style={styles.errorBannerText}>{likesError}</Text>
        </View>
      )}

      <View style={styles.commentsSection}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View>
            <Text style={styles.sectionTitle}>
              Comments ({comments.length})
            </Text>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
            >
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
                  onSubmitEditing={() => {}}
                />
                <Pressable
                  style={[
                    styles.commentButton,
                    (!commentDraft.trim() || isPostingComment) &&
                      styles.commentButtonDisabled,
                  ]}
                  onPress={ensureAuth(handleSubmitComment)}
                  disabled={!commentDraft.trim().length || isPostingComment}
                >
                  <Text style={styles.commentButtonText}>
                    {isPostingComment ? "Posting..." : "Post"}
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>

            {commentsError && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning-outline" size={16} color="#f59e0b" />
                <Text style={styles.errorBannerText}>{commentsError}</Text>
                <Pressable
                  onPress={() => {
                    if (needsLogin) {
                      router.push("/auth/login");
                    } else {
                      // TODO: Attempt a reload by emitting a navigation refresh or trigger parent
                    }
                  }}
                  style={{ marginLeft: 12 }}
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
              <ActivityIndicator size="small" color="#fff" />
            ) : commentsError && !comments.length && needsLogin ? (
              <View style={styles.emptyCommentsAction}>
                <Text style={styles.emptyCommentsText}>
                  Sign in to view comments
                </Text>
                <Pressable
                  onPress={() => router.push("/auth/login")}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                </Pressable>
              </View>
            ) : comments.length ? (
              <FlatList
                data={comments}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.commentList}
                renderItem={renderCommentItem}
                onEndReached={handleEndReached}
                onEndReachedThreshold={0.5}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={11}
                initialNumToRender={10}
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
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
});

export default PlayerDetails;
