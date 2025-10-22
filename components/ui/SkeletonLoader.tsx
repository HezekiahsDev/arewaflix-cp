import React, { useEffect } from "react";
import { DimensionValue, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      shimmerValue.value,
      [0, 0.5, 1],
      [0.3, 0.5, 0.3]
    );
    return { opacity };
  });

  return (
    <View style={[{ width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            borderRadius,
            backgroundColor: "#e2e8f0",
          },
          animatedStyle,
        ]}
        className="dark:bg-slate-700"
      />
    </View>
  );
}

// Skeleton for video cards
export function VideoCardSkeleton() {
  return (
    <View className="mb-6">
      <SkeletonLoader width="100%" height={180} borderRadius={12} />
      <View className="mt-3 flex-row">
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View className="ml-3 flex-1">
          <SkeletonLoader width="90%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="60%" height={14} />
        </View>
      </View>
    </View>
  );
}

// Skeleton for horizontal video rail
export function VideoRailSkeleton() {
  return (
    <View className="flex-row">
      {[1, 2, 3].map((item) => (
        <View key={item} className="mr-4" style={{ width: 160 }}>
          <SkeletonLoader width={160} height={120} borderRadius={12} />
          <SkeletonLoader
            width="90%"
            height={14}
            style={{ marginTop: 8, marginBottom: 6 }}
          />
          <SkeletonLoader width="60%" height={12} />
        </View>
      ))}
    </View>
  );
}

// Skeleton for shorts rail
export function ShortsRailSkeleton() {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4].map((item) => (
        <View key={item} className="mr-3" style={{ width: 100 }}>
          <SkeletonLoader width={100} height={160} borderRadius={12} />
          <SkeletonLoader width="80%" height={12} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

// Skeleton for featured video card
export function FeaturedVideoSkeleton() {
  return (
    <View className="mb-4">
      <SkeletonLoader width="100%" height={220} borderRadius={0} />
      <View className="px-4 pt-4">
        <SkeletonLoader width="80%" height={20} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="95%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonLoader width="40%" height={14} />
      </View>
    </View>
  );
}

// Complete home screen skeleton
export function HomeScreenSkeleton() {
  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <FeaturedVideoSkeleton />
      <View className="px-4 pt-6">
        {/* Shorts Section */}
        <SkeletonLoader width={100} height={24} style={{ marginBottom: 12 }} />
        <ShortsRailSkeleton />

        {/* Trending Section */}
        <View className="mt-12">
          <SkeletonLoader
            width={120}
            height={24}
            style={{ marginBottom: 12 }}
          />
          <VideoRailSkeleton />
        </View>

        {/* Categories Section */}
        <View className="mt-12">
          <SkeletonLoader
            width={100}
            height={24}
            style={{ marginBottom: 12 }}
          />
          <View className="flex-row flex-wrap">
            {[1, 2, 3, 4, 5].map((item) => (
              <SkeletonLoader
                key={item}
                width={80}
                height={32}
                borderRadius={16}
                style={{ marginRight: 8, marginBottom: 8 }}
              />
            ))}
          </View>
        </View>

        {/* Top Videos Section */}
        <View className="mt-12">
          <SkeletonLoader
            width={120}
            height={24}
            style={{ marginBottom: 12 }}
          />
          <VideoRailSkeleton />
        </View>
      </View>
    </View>
  );
}
