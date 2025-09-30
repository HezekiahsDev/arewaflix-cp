import { formatRelativeDate, formatViewCount, Video } from "@/lib/api/videos";
import { getDurationLabel } from "@/lib/videos/formatters";
import React from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

export interface RelatedVideoCardProps {
  /** Video data */
  video: Video;
  /** Callback when video is pressed */
  onPress?: (video: Video) => void;
  /** Layout style - grid or list */
  layout?: "grid" | "list";
  /** Custom styling */
  className?: string;
}

/**
 * RelatedVideoCard - Individual video card component
 * Shows thumbnail, duration, title, author, views, and date
 */
export function RelatedVideoCard({
  video,
  onPress,
  layout = "grid",
  className = "",
}: RelatedVideoCardProps) {
  const viewCount =
    typeof video.views === "number" ? formatViewCount(video.views) : "0";
  const publishDate = formatRelativeDate(video.createdAt);
  const duration = getDurationLabel(video);

  const isListLayout = layout === "list";

  return (
    <Pressable onPress={() => onPress?.(video)} className={`mb-4 ${className}`}>
      <View className={`${isListLayout ? "flex-row gap-3" : "flex-col"}`}>
        {/* Thumbnail Container */}
        <View
          className={`relative bg-surface-dark border border-border-dark rounded-xl overflow-hidden shadow-md ${
            isListLayout ? "w-44 h-28" : "w-full aspect-video"
          }`}
        >
          {/* Video Thumbnail */}
          {video.imageUrl ? (
            <Image
              source={{ uri: video.imageUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-surface-muted flex items-center justify-center">
              <Text className="text-text-muted text-4xl">🎬</Text>
            </View>
          )}

          {/* Play Button Overlay */}
          <View className="absolute inset-0 flex items-center justify-center">
            <View className="w-10 h-10 bg-primary/90 rounded-full flex items-center justify-center shadow-lg border border-white/20">
              <Text className="text-white text-xl ml-0.5">▶</Text>
            </View>
          </View>

          {/* Duration Badge */}
          {duration && (
            <View className="absolute bottom-2 right-2 bg-background-dark/90 rounded-md px-2 py-1">
              <Text className="text-text-dark text-xs font-semibold">
                {duration}
              </Text>
            </View>
          )}

          {/* Short Video Badge */}
          {video.isShort && (
            <View className="absolute top-2 left-2 bg-accent rounded-md px-2 py-1">
              <Text className="text-background-dark text-xs font-bold">
                SHORT
              </Text>
            </View>
          )}
        </View>

        {/* Video Info */}
        <View className={`${isListLayout ? "flex-1" : "mt-3"}`}>
          {/* Title */}
          <Text
            className={`font-bold text-text-dark leading-6 ${
              isListLayout ? "text-sm" : "text-base"
            }`}
            numberOfLines={isListLayout ? 2 : 2}
          >
            {video.title || "Untitled Video"}
          </Text>

          {/* Author */}
          <Text
            className={`text-text-muted mt-2 font-medium ${
              isListLayout ? "text-xs" : "text-sm"
            }`}
            numberOfLines={1}
          >
            {video.author || "Unknown Author"}
          </Text>

          {/* Views and Date */}
          <View
            className={`flex-row items-center mt-1 ${
              isListLayout ? "text-xs" : "text-sm"
            }`}
          >
            <Text className="text-gray-500 text-xs">{viewCount} Views</Text>
            <Text className="text-gray-500 mx-2 text-xs">•</Text>
            <Text className="text-gray-500 text-xs">{publishDate}</Text>
          </View>

          {/* Category Badge (optional) */}
          {video.category && !isListLayout && (
            <View className="mt-2">
              <View className="bg-blue-600/20 border border-blue-500 rounded-full px-2 py-1 self-start">
                <Text className="text-blue-400 text-xs font-medium">
                  {video.category}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export interface RelatedVideosProps {
  /** Array of related videos */
  videos: Video[];
  /** Current video ID to exclude from related */
  currentVideoId?: string;
  /** Layout style - grid or list */
  layout?: "grid" | "list";
  /** Number of columns for grid layout */
  numColumns?: number;
  /** Maximum number of videos to show */
  maxVideos?: number;
  /** Whether to show section header */
  showHeader?: boolean;
  /** Custom header title */
  headerTitle?: string;
  /** Callback when video is selected */
  onVideoPress?: (video: Video) => void;
  /** Callback when "View All" is pressed */
  onViewAllPress?: () => void;
  /** Whether to show horizontal scroll for grid */
  horizontal?: boolean;
  /** Custom styling */
  className?: string;
}

/**
 * RelatedVideos - Shows a collection of related videos
 * Supports both grid and list layouts with customizable options
 */
export default function RelatedVideos({
  videos,
  currentVideoId,
  layout = "grid",
  numColumns = 2,
  maxVideos = 10,
  showHeader = true,
  headerTitle = "Related Videos",
  onVideoPress,
  onViewAllPress,
  horizontal = false,
  className = "",
}: RelatedVideosProps) {
  // Filter out current video and limit results
  const filteredVideos = videos
    .filter((video) => video.id !== currentVideoId)
    .slice(0, maxVideos);

  if (filteredVideos.length === 0) {
    return (
      <View className={`p-4 ${className}`}>
        <Text className="text-gray-400 text-center">
          No related videos available
        </Text>
      </View>
    );
  }

  const renderVideoCard = ({ item }: { item: Video }) => (
    <View
      className={
        layout === "grid" && !horizontal
          ? `w-1/${numColumns} px-1`
          : horizontal
            ? "w-48 mr-3"
            : "w-full"
      }
    >
      <RelatedVideoCard video={item} onPress={onVideoPress} layout={layout} />
    </View>
  );

  return (
    <View className={className}>
      {/* Section Header */}
      {showHeader && (
        <View className="flex-row items-center justify-between px-4 mb-4">
          <Text className="text-white text-lg font-bold">{headerTitle}</Text>
          {onViewAllPress && filteredVideos.length >= maxVideos && (
            <Pressable onPress={onViewAllPress}>
              <Text className="text-blue-400 text-sm font-medium">
                View All
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Videos List/Grid */}
      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {filteredVideos.map((video, index) => (
            <View key={video.id || index} className="w-48 mr-3">
              <RelatedVideoCard
                video={video}
                onPress={onVideoPress}
                layout={layout}
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredVideos}
          renderItem={renderVideoCard}
          keyExtractor={(item, index) => item.id || index.toString()}
          numColumns={layout === "grid" ? numColumns : 1}
          scrollEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          columnWrapperStyle={
            layout === "grid" && numColumns > 1
              ? {
                  justifyContent: "space-between",
                }
              : undefined
          }
        />
      )}
    </View>
  );
}

// Specialized components for different use cases
export interface RelatedVideosSidebarProps
  extends Omit<RelatedVideosProps, "layout" | "numColumns" | "horizontal"> {
  /** Whether to show as compact list */
  compact?: boolean;
}

/**
 * RelatedVideosSidebar - Vertical sidebar layout for desktop/tablet
 */
export function RelatedVideosSidebar({
  compact = false,
  ...props
}: RelatedVideosSidebarProps) {
  return (
    <RelatedVideos
      {...props}
      layout="list"
      numColumns={1}
      horizontal={false}
      className={`${compact ? "max-w-xs" : "max-w-sm"} ${props.className || ""}`}
    />
  );
}

export interface RelatedVideosGridProps
  extends Omit<RelatedVideosProps, "layout" | "horizontal"> {
  /** Whether to show as horizontal scrolling grid */
  scrollable?: boolean;
}

/**
 * RelatedVideosGrid - Grid layout for mobile/main content area
 */
export function RelatedVideosGrid({
  scrollable = false,
  numColumns = 2,
  ...props
}: RelatedVideosGridProps) {
  return (
    <RelatedVideos
      {...props}
      layout="grid"
      numColumns={numColumns}
      horizontal={scrollable}
    />
  );
}

// Export utilities for video card management
export const RelatedVideosUtils = {
  /**
   * Sort videos by relevance (views, date, etc.)
   */
  sortByRelevance: (videos: Video[]): Video[] => {
    return [...videos].sort((a, b) => {
      // Sort by views (descending), then by date (newest first)
      const viewsA = a.views || 0;
      const viewsB = b.views || 0;

      if (viewsA !== viewsB) {
        return viewsB - viewsA;
      }

      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  },

  /**
   * Filter videos by category
   */
  filterByCategory: (videos: Video[], category: string): Video[] => {
    return videos.filter(
      (video) => video.category?.toLowerCase() === category.toLowerCase()
    );
  },

  /**
   * Get videos excluding specific IDs
   */
  excludeVideos: (videos: Video[], excludeIds: string[]): Video[] => {
    return videos.filter((video) => !excludeIds.includes(video.id));
  },

  /**
   * Shuffle array of videos
   */
  shuffleVideos: (videos: Video[]): Video[] => {
    const shuffled = [...videos];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Get recommended videos based on current video
   */
  getRecommendations: (
    allVideos: Video[],
    currentVideo: Video,
    count: number = 10
  ): Video[] => {
    // Filter by same category first, then by author, then random
    const sameCategory = RelatedVideosUtils.filterByCategory(
      allVideos,
      currentVideo.category || ""
    );

    const sameAuthor = allVideos.filter(
      (video) =>
        video.author === currentVideo.author && video.id !== currentVideo.id
    );

    const others = allVideos.filter(
      (video) =>
        video.id !== currentVideo.id &&
        video.category !== currentVideo.category &&
        video.author !== currentVideo.author
    );

    const recommended = [
      ...RelatedVideosUtils.excludeVideos(sameCategory, [currentVideo.id]),
      ...RelatedVideosUtils.excludeVideos(sameAuthor, [currentVideo.id]),
      ...RelatedVideosUtils.shuffleVideos(others),
    ];

    return RelatedVideosUtils.sortByRelevance(recommended).slice(0, count);
  },
};
