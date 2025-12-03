import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import CommentItem from "./player/CommentItem";
import SocialButton from "./player/SocialButton";

export default function PlayerDetails(props: any) {
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
          onPress={handleLikePress}
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
          onPress={handleDislikePress}
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
          onPress={handleSavePress}
          style={styles.socialButton}
          activeStyle={styles.socialButtonActive}
          labelStyle={styles.socialLabel}
          activeIconColor="#007AFF"
        />

        <SocialButton
          icon="flag-outline"
          label="Report"
          onPress={() => handleReportPress()}
          style={styles.socialButton}
          labelStyle={styles.socialLabel}
          iconColor="#ff3b30"
        />
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
            onSubmitEditing={() => {}}
          />
          <Pressable
            style={[
              styles.commentButton,
              (!commentDraft.trim() || isPostingComment || !token) &&
                styles.commentButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!commentDraft.trim().length || isPostingComment || !token}
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
            keyExtractor={(item: any, index: number) => `${item.id}-${index}`}
            contentContainerStyle={styles.commentList}
            renderItem={useCallback(
              ({ item }: any) => (
                <CommentItem
                  comment={item}
                  isLiked={likedCommentIds.has(String(item.id))}
                  onLikePress={toggleLikeComment}
                  onReportPress={handleReportPress}
                  disabled={!token || likingCommentId === String(item.id)}
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
                likingCommentId,
              ]
            )}
            onEndReached={() => loadMoreComments()}
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
  );
}
