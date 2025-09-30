import { formatRelativeDate, formatViewCount, Video } from "@/lib/api/videos";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface VideoMetaProps {
  /** Video data object */
  video: Video;
  /** Callback when category is pressed */
  onCategoryPress?: (categoryId: string) => void;
  /** Custom styling */
  className?: string;
}

/**
 * VideoMeta - Displays video metadata like views, date, and category
 * Similar to the HTML structure: "67 Views · 01/23/25 · Film & Animation"
 */
export function VideoMeta({
  video,
  onCategoryPress,
  className = "",
}: VideoMetaProps) {
  const viewCount =
    typeof video.views === "number" ? formatViewCount(video.views) : "0";
  const publishDate = formatRelativeDate(video.createdAt);
  const categoryName = video.category || "Uncategorized";

  return (
    <View className={`flex-row items-center flex-wrap ${className}`}>
      <Text className="text-text-muted text-sm">
        <Text>{viewCount} Views</Text>
        <Text className="mx-2 font-bold">·</Text>
        <Text>{publishDate}</Text>
        <Text className="mx-2 font-bold">·</Text>
        <Pressable
          onPress={() => onCategoryPress?.(video.category || "")}
          className="bg-transparent"
        >
          <Text className="text-primary text-sm font-medium">
            {categoryName}
          </Text>
        </Pressable>
      </Text>
    </View>
  );
}

export interface VideoTitleProps {
  /** Video title */
  title: string;
  /** Custom styling */
  className?: string;
}

/**
 * VideoTitle - Displays the main video title
 */
export function VideoTitle({ title, className = "" }: VideoTitleProps) {
  return (
    <View className={className}>
      <Text
        className="text-2xl font-bold text-text-dark mb-0 leading-relaxed"
        numberOfLines={2}
      >
        {title}
      </Text>
    </View>
  );
}

export interface VideoActionsProps {
  /** Current like count */
  likes?: number;
  /** Current dislike count */
  dislikes?: number;
  /** Whether user has liked the video */
  hasLiked?: boolean;
  /** Whether user has disliked the video */
  hasDisliked?: boolean;
  /** Like button press handler */
  onLikePress?: () => void;
  /** Dislike button press handler */
  onDislikePress?: () => void;
  /** Share button press handler */
  onSharePress?: () => void;
  /** Custom styling */
  className?: string;
}

/**
 * VideoActions - Like/dislike buttons and share functionality
 */
export function VideoActions({
  likes = 0,
  dislikes = 0,
  hasLiked = false,
  hasDisliked = false,
  onLikePress,
  onDislikePress,
  onSharePress,
  className = "",
}: VideoActionsProps) {
  const totalVotes = likes + dislikes;
  const likePercentage = totalVotes > 0 ? (likes / totalVotes) * 100 : 0;

  return (
    <View
      className={`flex-row items-center justify-between py-4 my-4 bg-surface-dark/30 rounded-xl border border-border-dark ${className}`}
    >
      {/* Like/Dislike Section */}
      <View className="flex-1 mr-4 px-4">
        <View className="flex-row items-center gap-4 w-full">
          {/* Like Button */}
          <Pressable
            onPress={onLikePress}
            className={`flex-row items-center gap-3 px-3 py-2 rounded-full ${
              hasLiked
                ? "bg-primary/20 border border-primary"
                : "bg-transparent border border-border-dark"
            }`}
          >
            <Text
              className={`text-xl ${hasLiked ? "text-primary" : "text-text-muted"}`}
            >
              👍
            </Text>
            <Text
              className={`text-sm font-semibold ${hasLiked ? "text-primary" : "text-text-muted"}`}
            >
              {likes}
            </Text>
          </Pressable>

          {/* Progress Bar */}
          <View className="flex-1 bg-surface-muted h-1.5 rounded-full overflow-hidden mx-3">
            <View
              className="bg-primary h-full rounded-full"
              style={{ width: `${likePercentage}%` }}
            />
          </View>

          {/* Dislike Button */}
          <Pressable
            onPress={onDislikePress}
            className={`flex-row items-center gap-3 px-3 py-2 rounded-full ${
              hasDisliked
                ? "bg-red-500/20 border border-red-500"
                : "bg-transparent border border-border-dark"
            }`}
          >
            <Text
              className={`text-xl ${hasDisliked ? "text-red-500" : "text-text-muted"}`}
            >
              👎
            </Text>
            <Text
              className={`text-sm font-semibold ${hasDisliked ? "text-red-500" : "text-text-muted"}`}
            >
              {dislikes}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Share Button */}
      <Pressable
        onPress={onSharePress}
        className="flex-row items-center gap-3 px-6 py-3 border border-border-dark rounded-full bg-surface-dark active:bg-surface-dark/70"
      >
        <Text className="text-xl">📤</Text>
        <Text className="text-text-dark text-sm font-semibold">Share</Text>
      </Pressable>
    </View>
  );
}

export interface VideoPublisherProps {
  /** Publisher/channel name */
  publisherName: string;
  /** Publisher avatar URL */
  publisherAvatar?: string;
  /** Subscriber count */
  subscriberCount?: number;
  /** Whether user is subscribed */
  isSubscribed?: boolean;
  /** Subscribe button press handler */
  onSubscribePress?: () => void;
  /** Publisher profile press handler */
  onPublisherPress?: () => void;
  /** Custom styling */
  className?: string;
}

/**
 * VideoPublisher - Shows publisher info and subscribe button
 */
export function VideoPublisher({
  publisherName,
  publisherAvatar,
  subscriberCount = 0,
  isSubscribed = false,
  onSubscribePress,
  onPublisherPress,
  className = "",
}: VideoPublisherProps) {
  return (
    <View
      className={`flex-row items-center justify-between py-5 border-b border-border-dark ${className}`}
    >
      {/* Publisher Info */}
      <Pressable
        onPress={onPublisherPress}
        className="flex-row items-center gap-4 flex-1 active:bg-surface-dark/30 rounded-xl p-2 -ml-2"
      >
        {/* Avatar */}
        <View className="w-12 h-12 bg-surface-dark border border-border-dark rounded-full overflow-hidden">
          {publisherAvatar ? (
            <Text className="text-2xl">📷</Text> // Placeholder - you can replace with proper Image component
          ) : (
            <View className="w-full h-full bg-surface-dark flex items-center justify-center">
              <Text className="text-text-muted text-2xl">👤</Text>
            </View>
          )}
        </View>

        {/* Name and Subscribers */}
        <View className="flex-1">
          <Text className="text-text-dark font-bold text-lg">
            {publisherName}
          </Text>
          <Text className="text-text-muted text-sm font-medium">
            {formatViewCount(subscriberCount)} Subscribers
          </Text>
        </View>
      </Pressable>

      {/* Subscribe Button */}
      <Pressable
        onPress={onSubscribePress}
        className={`px-8 py-3 rounded-full ${
          isSubscribed
            ? "bg-surface-dark border border-border-dark"
            : "bg-primary border border-primary"
        }`}
      >
        <Text
          className={`font-bold text-sm ${
            isSubscribed ? "text-text-muted" : "text-white"
          }`}
        >
          {isSubscribed ? "Subscribed" : "Subscribe"}
        </Text>
      </Pressable>
    </View>
  );
}

export interface VideoDescriptionProps {
  /** Video description text */
  description: string;
  /** Whether to show full description or truncated */
  expanded?: boolean;
  /** Callback when show more/less is pressed */
  onToggleExpanded?: () => void;
  /** Maximum lines to show when collapsed */
  maxLines?: number;
  /** Custom styling */
  className?: string;
}

/**
 * VideoDescription - Shows video description with expand/collapse functionality
 */
export function VideoDescription({
  description,
  expanded = false,
  onToggleExpanded,
  maxLines = 3,
  className = "",
}: VideoDescriptionProps) {
  const needsExpansion = description.length > 150; // Simple length check

  return (
    <View
      className={`bg-surface-dark border border-border-dark rounded-xl p-5 my-4 ${className}`}
    >
      <Text
        className="text-text-dark text-sm leading-6"
        numberOfLines={expanded ? undefined : maxLines}
      >
        {description || "No description available."}
      </Text>

      {needsExpansion && (
        <Pressable onPress={onToggleExpanded} className="mt-3 self-start">
          <Text className="text-primary text-sm font-semibold">
            {expanded ? "Show less" : "Show more"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// Export all components as a combined metadata display
export interface VideoMetadataProps {
  video: Video;
  likes?: number;
  dislikes?: number;
  hasLiked?: boolean;
  hasDisliked?: boolean;
  isSubscribed?: boolean;
  descriptionExpanded?: boolean;
  onLikePress?: () => void;
  onDislikePress?: () => void;
  onSharePress?: () => void;
  onSubscribePress?: () => void;
  onPublisherPress?: () => void;
  onCategoryPress?: (categoryId: string) => void;
  onToggleDescription?: () => void;
}

/**
 * VideoMetadata - Combined component with all video metadata
 */
export function VideoMetadata({
  video,
  likes = 0,
  dislikes = 0,
  hasLiked = false,
  hasDisliked = false,
  isSubscribed = false,
  descriptionExpanded = false,
  onLikePress,
  onDislikePress,
  onSharePress,
  onSubscribePress,
  onPublisherPress,
  onCategoryPress,
  onToggleDescription,
}: VideoMetadataProps) {
  return (
    <View className="px-4">
      {/* Video Stats */}
      <VideoMeta
        video={video}
        onCategoryPress={onCategoryPress}
        className="mb-2"
      />

      {/* Video Title */}
      <VideoTitle title={video.title || "Untitled Video"} className="mb-3" />

      {/* Like/Dislike Actions */}
      <VideoActions
        likes={likes}
        dislikes={dislikes}
        hasLiked={hasLiked}
        hasDisliked={hasDisliked}
        onLikePress={onLikePress}
        onDislikePress={onDislikePress}
        onSharePress={onSharePress}
      />

      {/* Divider */}
      <View className="h-px bg-gray-600 my-4" />

      {/* Publisher Info */}
      <VideoPublisher
        publisherName={video.author || "Unknown Publisher"}
        publisherAvatar={undefined}
        subscriberCount={0}
        isSubscribed={isSubscribed}
        onSubscribePress={onSubscribePress}
        onPublisherPress={onPublisherPress}
      />

      {/* Video Description */}
      <VideoDescription
        description={video.description || ""}
        expanded={descriptionExpanded}
        onToggleExpanded={onToggleDescription}
      />
    </View>
  );
}
