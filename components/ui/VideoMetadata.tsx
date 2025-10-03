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
      <Text className="text-gray-500 text-sm">
        <Text>{viewCount} Views</Text>
        <Text className="mx-2 font-bold">·</Text>
        <Text>{publishDate}</Text>
        <Text className="mx-2 font-bold">·</Text>
        <Pressable
          onPress={() => onCategoryPress?.(video.category || "")}
          className="bg-transparent"
        >
          <Text className="text-blue-500 text-sm">{categoryName}</Text>
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
      <Text className="text-xl font-bold text-white mb-0" numberOfLines={2}>
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
      className={`flex-row items-center justify-between py-2 my-3 ${className}`}
    >
      {/* Like/Dislike Section */}
      <View className="flex-1 mr-4">
        <View className="flex-row items-center gap-3 w-full">
          {/* Like Button */}
          <Pressable
            onPress={onLikePress}
            className={`flex-row items-center gap-2 px-2 py-1 rounded ${
              hasLiked ? "bg-blue-100" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-lg ${hasLiked ? "text-blue-500" : "text-gray-400"}`}
            >
              👍
            </Text>
            <Text
              className={`text-sm ${hasLiked ? "text-blue-500" : "text-gray-400"}`}
            >
              {likes}
            </Text>
          </Pressable>

          {/* Progress Bar */}
          <View className="flex-1 bg-gray-200 h-1 rounded-full overflow-hidden mx-2">
            <View
              className="bg-green-500 h-full"
              style={{ width: `${likePercentage}%` }}
            />
          </View>

          {/* Dislike Button */}
          <Pressable
            onPress={onDislikePress}
            className={`flex-row items-center gap-2 px-2 py-1 rounded ${
              hasDisliked ? "bg-red-100" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-lg ${hasDisliked ? "text-red-500" : "text-gray-400"}`}
            >
              👎
            </Text>
            <Text
              className={`text-sm ${hasDisliked ? "text-red-500" : "text-gray-400"}`}
            >
              {dislikes}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Share Button */}
      <Pressable
        onPress={onSharePress}
        className="flex-row items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg"
      >
        <Text className="text-lg">📤</Text>
        <Text className="text-gray-600 text-sm font-medium">Share</Text>
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
    <View className={`flex-row items-center justify-between py-4 ${className}`}>
      {/* Publisher Info */}
      <Pressable
        onPress={onPublisherPress}
        className="flex-row items-center gap-3 flex-1"
      >
        {/* Avatar */}
        <View className="w-11 h-11 bg-gray-300 rounded-full overflow-hidden">
          {publisherAvatar ? (
            <Text>📷</Text> // Placeholder - you can replace with proper Image component
          ) : (
            <View className="w-full h-full bg-gray-300 flex items-center justify-center">
              <Text className="text-gray-500 text-lg">👤</Text>
            </View>
          )}
        </View>

        {/* Name and Subscribers */}
        <View className="flex-1">
          <Text className="text-white font-bold text-base">
            {publisherName}
          </Text>
          <Text className="text-gray-400 text-sm">
            {formatViewCount(subscriberCount)} Subscribers
          </Text>
        </View>
      </Pressable>

      {/* Subscribe Button */}
      <Pressable
        onPress={onSubscribePress}
        className={`px-6 py-2 rounded-lg ${
          isSubscribed
            ? "bg-gray-600 border border-gray-500"
            : "bg-red-600 border border-red-600"
        }`}
      >
        <Text className="text-white font-medium text-sm">
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
    <View className={`bg-gray-800 rounded-lg p-4 my-4 ${className}`}>
      <Text
        className="text-gray-200 text-sm leading-5"
        numberOfLines={expanded ? undefined : maxLines}
      >
        {description || "No description available."}
      </Text>

      {needsExpansion && (
        <Pressable onPress={onToggleExpanded} className="mt-2">
          <Text className="text-gray-300 text-xs font-medium">
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
