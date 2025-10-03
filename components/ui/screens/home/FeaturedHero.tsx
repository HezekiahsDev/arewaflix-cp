import StarBarsIcon from "@/assets/icons/icon-pack-one";
import { Video } from "@/lib/api/videos";
import { buildHeroMeta } from "@/lib/videos/formatters";
import { resolveVideoMedia } from "@/lib/videos/media";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const AnimatedImageBackground =
  Animated.createAnimatedComponent(ImageBackground);

export type FeaturedHeroProps = {
  items: Video[];
};

export function FeaturedHero({ items }: FeaturedHeroProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const transition = useRef(new Animated.Value(0)).current;

  const scale = useMemo(
    () =>
      transition.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1],
      }),
    [transition]
  );

  const animatedStyles = useMemo(
    () => ({
      opacity: transition,
      transform: [{ scale }],
    }),
    [scale, transition]
  );

  useEffect(() => {
    if (!items.length) {
      setActiveIndex(0);
      return undefined;
    }

    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 6000);

    return () => clearInterval(id);
  }, [items.length]);

  useEffect(() => {
    if (activeIndex > items.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, items.length]);

  const item = items[activeIndex] ?? items[0];
  const metaLine = useMemo(
    () => (item ? buildHeroMeta(item) : undefined),
    [item]
  );

  const handlePlayVideo = useCallback(() => {
    if (!item) return;

    console.log("[FeaturedHero] Analyzing featured video:", {
      id: item.id,
      title: item.title,
      videoLocation: item.videoLocation,
      videoId: item.videoId,
    });

    const media = resolveVideoMedia(item);
    console.log("[FeaturedHero] Resolved media type:", media);

    if (media.kind === "direct") {
      console.log(
        "[FeaturedHero] Direct video detected, navigating to player with URI:",
        media.uri
      );
      router.push({
        pathname: "/player",
        params: {
          uri: media.uri,
          title: item.title,
          poster: item.imageUrl,
        },
      });
    } else if (media.kind === "external") {
      console.log(
        "[FeaturedHero] External video detected (YouTube), opening in browser:",
        {
          videoId: media.videoId,
          watchUrl: media.watchUrl,
        }
      );
      void Linking.openURL(media.watchUrl).catch((error) => {
        console.error("[FeaturedHero] Failed to open external URL:", error);
      });
    } else if (item.videoLocation) {
      console.log(
        "[FeaturedHero] Fallback to videoLocation:",
        item.videoLocation
      );
      void Linking.openURL(item.videoLocation).catch((error) => {
        console.error("[FeaturedHero] Failed to open videoLocation:", error);
      });
    } else {
      console.warn(
        "[FeaturedHero] No playable source found for video:",
        item.id
      );
    }
  }, [item, router]);

  useEffect(() => {
    if (!items.length) {
      return;
    }

    transition.setValue(0);

    Animated.timing(transition, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, items.length, transition]);

  if (!item) {
    return null;
  }

  return (
    <View style={styles.featuredHeroContainer}>
      <AnimatedImageBackground
        source={{ uri: item.imageUrl }}
        className="h-72 w-full"
        style={animatedStyles}
      >
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
              {item.title}
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
        {items.length > 1 ? (
          <View className="absolute bottom-5 left-0 right-0 flex-row justify-center gap-2">
            {items.map((_, index) => (
              <View
                key={index}
                className={`h-2 w-2 rounded-full ${index === activeIndex ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </View>
        ) : null}
      </AnimatedImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  featuredHeroContainer: {
    overflow: "hidden",
  },
});
