import StarBarsIcon from "@/assets/icons/icon-pack-one";
import { Video } from "@/lib/api/videos";
import { buildHeroMeta } from "@/lib/videos/formatters";
import { resolveVideoMedia } from "@/lib/videos/media";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  ImageBackground,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type FeaturedVideoCardProps = {
  video: Video;
};

export function FeaturedVideoCard({ video }: FeaturedVideoCardProps) {
  const router = useRouter();
  const metaLine = useMemo(() => buildHeroMeta(video), [video]);

  const handlePlayVideo = useCallback(() => {
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
    } else if (media.kind === "external") {
      Linking.openURL(media.watchUrl).catch((error) => {
        console.error("Failed to open external URL:", error);
      });
    } else if (video.videoLocation) {
      Linking.openURL(video.videoLocation).catch((error) => {
        console.error("Failed to open videoLocation:", error);
      });
    } else {
      console.warn("No playable source found for video:", video.id);
    }
  }, [video, router]);

  return (
    <View style={styles.featuredVideoContainer}>
      <ImageBackground source={{ uri: video.imageUrl }} className="h-72 w-full">
        <View className="absolute inset-0 bg-black/45" />
        <View className="flex-1 justify-end p-6">
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <StarBarsIcon size={16} color="#f59e0b" />
              <Text
                style={{ marginLeft: 8 }}
                className="text-sm font-semibold uppercase tracking-widest text-white"
              >
                <Text style={{ color: "#f59e0b" }}>Featured video</Text>
              </Text>
            </View>
            <Text
              className="mt-3 text-3xl font-semibold text-white"
              numberOfLines={2}
            >
              {video.title}
            </Text>
            {metaLine ? (
              <Text className="mt-2 text-sm text-white/80">{metaLine}</Text>
            ) : null}
            <View className="mt-5 flex-row flex-wrap items-center gap-3">
              <Pressable
                onPress={handlePlayVideo}
                className="rounded-full px-5 py-2"
                style={{ backgroundColor: "rgba(14,165,233,0.70)" }}
              >
                <Text className="text-sm font-semibold uppercase tracking-wide text-white">
                  PLAY
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  featuredVideoContainer: {
    overflow: "hidden",
  },
});
