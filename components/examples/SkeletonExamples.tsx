// Example usage of Splash Screen and Skeleton Loaders
// This file demonstrates how to use the components in your app

import {
  FeaturedVideoSkeleton,
  HomeScreenSkeleton,
  ShortsRailSkeleton,
  SkeletonLoader,
  VideoCardSkeleton,
  VideoRailSkeleton,
} from "@/components/ui/SkeletonLoader";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

// Example 1: Simple skeleton loader
export function SimpleSkeletonExample() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => setLoading(false), 3000);
  }, []);

  return (
    <View className="p-4">
      {loading ? (
        <>
          <SkeletonLoader
            width="80%"
            height={24}
            style={{ marginBottom: 12 }}
          />
          <SkeletonLoader
            width="100%"
            height={16}
            style={{ marginBottom: 8 }}
          />
          <SkeletonLoader width="90%" height={16} />
        </>
      ) : (
        <>
          <Text className="text-2xl font-bold mb-3">Welcome Back!</Text>
          <Text className="text-base">
            Your content has loaded successfully.
          </Text>
          <Text className="text-base">Here is your actual data.</Text>
        </>
      )}
    </View>
  );
}

// Example 2: Video cards skeleton
export function VideoCardsExample() {
  const [loading, setLoading] = useState(true);

  return (
    <View className="p-4">
      <Text className="text-xl font-bold mb-4">Your Videos</Text>
      {loading ? (
        <>
          <VideoCardSkeleton />
          <VideoCardSkeleton />
          <VideoCardSkeleton />
        </>
      ) : (
        <Text>Your video cards would appear here</Text>
      )}

      <Pressable
        onPress={() => setLoading(!loading)}
        className="mt-4 bg-blue-500 p-3 rounded-lg"
      >
        <Text className="text-white text-center">Toggle Loading State</Text>
      </Pressable>
    </View>
  );
}

// Example 3: Video rail skeleton
export function VideoRailExample() {
  const [loading, setLoading] = useState(true);

  return (
    <View className="p-4">
      <Text className="text-xl font-bold mb-4">Trending Videos</Text>
      {loading ? (
        <VideoRailSkeleton />
      ) : (
        <Text>Your video rail would appear here</Text>
      )}

      <Pressable
        onPress={() => setLoading(!loading)}
        className="mt-4 bg-blue-500 p-3 rounded-lg"
      >
        <Text className="text-white text-center">Toggle Loading State</Text>
      </Pressable>
    </View>
  );
}

// Example 4: Shorts rail skeleton
export function ShortsRailExample() {
  const [loading, setLoading] = useState(true);

  return (
    <View className="p-4">
      <Text className="text-xl font-bold mb-4">Shorts</Text>
      {loading ? (
        <ShortsRailSkeleton />
      ) : (
        <Text>Your shorts rail would appear here</Text>
      )}

      <Pressable
        onPress={() => setLoading(!loading)}
        className="mt-4 bg-blue-500 p-3 rounded-lg"
      >
        <Text className="text-white text-center">Toggle Loading State</Text>
      </Pressable>
    </View>
  );
}

// Example 5: Featured video skeleton
export function FeaturedVideoExample() {
  const [loading, setLoading] = useState(true);

  return (
    <View>
      {loading ? (
        <FeaturedVideoSkeleton />
      ) : (
        <View className="p-4">
          <Text className="text-2xl font-bold">Featured Video Title</Text>
          <Text className="text-base mt-2">Video description goes here</Text>
        </View>
      )}

      <Pressable
        onPress={() => setLoading(!loading)}
        className="mx-4 bg-blue-500 p-3 rounded-lg"
      >
        <Text className="text-white text-center">Toggle Loading State</Text>
      </Pressable>
    </View>
  );
}

// Example 6: Full home screen skeleton
export function FullScreenExample() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => setLoading(false), 3000);
  }, []);

  return (
    <>
      {loading ? (
        <HomeScreenSkeleton />
      ) : (
        <View className="flex-1 p-4 justify-center items-center">
          <Text className="text-2xl font-bold mb-4">Content Loaded!</Text>
          <Text className="text-base text-center mb-4">
            Your full home screen content would appear here
          </Text>
          <Pressable
            onPress={() => setLoading(true)}
            className="bg-blue-500 p-3 rounded-lg"
          >
            <Text className="text-white">Reload</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

// Example 7: Custom skeleton with different sizes
export function CustomSkeletonsExample() {
  return (
    <View className="p-4">
      <Text className="text-xl font-bold mb-4">Custom Skeletons</Text>

      {/* Small rectangle */}
      <SkeletonLoader
        width={100}
        height={20}
        borderRadius={4}
        style={{ marginBottom: 12 }}
      />

      {/* Medium rectangle */}
      <SkeletonLoader
        width={200}
        height={40}
        borderRadius={8}
        style={{ marginBottom: 12 }}
      />

      {/* Large rectangle */}
      <SkeletonLoader
        width="100%"
        height={120}
        borderRadius={12}
        style={{ marginBottom: 12 }}
      />

      {/* Circle (avatar) */}
      <SkeletonLoader
        width={60}
        height={60}
        borderRadius={30}
        style={{ marginBottom: 12 }}
      />

      {/* Full width pill */}
      <SkeletonLoader width="100%" height={40} borderRadius={20} />
    </View>
  );
}
