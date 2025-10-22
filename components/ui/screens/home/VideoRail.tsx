import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { Video } from "@/lib/api/videos";
import {
  buildVideoSubtitle,
  getAuthorLabel,
  getDurationLabel,
} from "@/lib/videos/formatters";
import { resolveVideoMedia } from "@/lib/videos/media";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Text as SvgText } from "react-native-svg";

const RANK_BADGE_WIDTH = 32;
const RANK_BADGE_EXTRA_HEIGHT = 36;

const screenWidth = Dimensions.get("window").width;

export const DEFAULT_RAIL_SPACING = 16;

export const DEFAULT_CARD_DIMENSIONS = {
  width: Math.min(screenWidth * 0.72, 320),
  height: 280,
  thumbnailHeight: 176,
};

export const COMPACT_CARD_DIMENSIONS = {
  width: 128,
  height: 192,
  thumbnailHeight: 128,
};

export type VideoCardDimensions = typeof DEFAULT_CARD_DIMENSIONS;

export type VideoRailProps = {
  videos: Video[];
  dimensions?: VideoCardDimensions;
  spacing?: number;
  showRank?: boolean;
};

export function VideoRail({
  videos,
  dimensions = DEFAULT_CARD_DIMENSIONS,
  spacing = DEFAULT_RAIL_SPACING,
  showRank = false,
}: VideoRailProps) {
  return (
    <FlatList
      data={videos}
      horizontal
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: spacing }}
      renderItem={({ item, index }) => (
        <VideoRailItem
          item={item}
          index={index}
          videosLength={videos.length}
          dimensions={dimensions}
          spacing={spacing}
          showRank={showRank}
        />
      )}
    />
  );
}

type VideoRailItemProps = {
  item: Video;
  index: number;
  videosLength: number;
  dimensions: VideoCardDimensions;
  spacing: number;
  showRank: boolean;
};

function VideoRailItem({
  item,
  index,
  videosLength,
  dimensions,
  spacing,
  showRank,
}: VideoRailItemProps) {
  const marginRight = index === videosLength - 1 ? 0 : spacing;

  if (showRank) {
    const rankHeight = dimensions.height + RANK_BADGE_EXTRA_HEIGHT;
    return (
      <View
        style={{
          marginRight,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
          }}
        >
          <RankBadge value={index + 1} height={rankHeight} />
          <View style={{ width: dimensions.width }}>
            <VideoCard video={item} dimensions={dimensions} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        width: dimensions.width,
        marginRight,
        alignItems: "center",
      }}
    >
      <VideoCard video={item} dimensions={dimensions} />
    </View>
  );
}

type RankBadgeProps = {
  value: number;
  height: number;
};

function RankBadge({ value, height }: RankBadgeProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;
  const secondaryStroke =
    colorScheme === "dark" ? Colors.dark.border : Colors.light.border;
  const label = `${value}`;
  const svgHeight = height;
  const baseline = svgHeight - svgHeight * 0.15;
  const fontSize = svgHeight * 0.5;
  const outerStrokeWidth = fontSize * 0.08;
  const innerStrokeWidth = fontSize * 0.015;
  const viewBoxWidth = RANK_BADGE_WIDTH;
  const centerX = viewBoxWidth / 2;

  return (
    <View style={[styles.rankBadgeContainer, { height }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`-12 -16 ${viewBoxWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMax meet"
      >
        <SvgText
          x={centerX}
          y={baseline}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="800"
          stroke={secondaryStroke}
          strokeWidth={outerStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.35}
        >
          {label}
        </SvgText>
        <SvgText
          x={centerX}
          y={baseline}
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="800"
          stroke={theme.text}
          strokeWidth={innerStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {label}
        </SvgText>
      </Svg>
    </View>
  );
}

type VideoCardProps = {
  video: Video;
  dimensions?: VideoCardDimensions;
};

function VideoCard({
  video,
  dimensions = DEFAULT_CARD_DIMENSIONS,
}: VideoCardProps) {
  const durationLabel = getDurationLabel(video);
  const authorLabel = getAuthorLabel(video);
  const subtitle = buildVideoSubtitle(video);
  const isCompact = dimensions.height <= 200;
  const router = useRouter();

  const handlePress = () => {
    try {
      const media = resolveVideoMedia(video);

      if (media.kind === "direct") {
        router.push({
          pathname: "/player",
          params: {
            uri: media.uri,
            title: video.title,
            poster: video.imageUrl,
            videoId: video.id,
          },
        });
        return;
      }

      if (media.kind === "external") {
        Linking.openURL(media.watchUrl).catch((err) => {
          console.error("Failed to open external URL:", err);
        });
        return;
      }

      if (video.videoLocation) {
        void Linking.openURL(video.videoLocation).catch((err) =>
          console.error("Failed to open videoLocation:", err)
        );
      }
    } catch (err) {
      console.error("Error handling video press:", err);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className="overflow-hidden rounded-2xl bg-card shadow-sm dark:bg-card-dark"
      style={{
        width: "100%",
        height: dimensions.height,
      }}
    >
      <Image
        source={{ uri: video.imageUrl }}
        className="w-full"
        style={{ height: dimensions.thumbnailHeight }}
      />
      {durationLabel ? (
        <View className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-white">
            {durationLabel}
          </Text>
        </View>
      ) : null}
      <View
        className="gap-1"
        style={{
          flex: 1,
          justifyContent: "space-between",
          paddingHorizontal: isCompact ? 12 : 16,
          paddingVertical: isCompact ? 10 : 16,
        }}
      >
        <Text
          className="text-base font-semibold text-text dark:text-text-dark"
          numberOfLines={isCompact ? 2 : 3}
        >
          {video.title}
        </Text>
        {authorLabel ? (
          <Text className="text-xs uppercase tracking-wide text-muted dark:text-muted-dark">
            {authorLabel}
          </Text>
        ) : null}
        {subtitle ? (
          <Text className="text-xs text-muted dark:text-muted-dark">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rankBadgeContainer: {
    width: RANK_BADGE_WIDTH,
    justifyContent: "flex-end",
    alignItems: "center",
    marginRight: 12,
    marginLeft: 0,
  },
});
