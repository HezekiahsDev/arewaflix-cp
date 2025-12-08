import { AVPlaybackStatus, Video as ExpoVideo, ResizeMode } from "expo-av";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, View } from "react-native";
import Watermark from "../Watermark";

export interface VideoPlayerProps {
  /** Video source URI */
  uri: string;
  /** Poster image URL to show before video loads */
  poster?: string;
  /** Whether video should start playing automatically */
  autoplay?: boolean;
  /** Whether to show default video controls */
  useNativeControls?: boolean;
  /** Whether to show custom overlay controls */
  showCustomControls?: boolean;
  /** Whether video should loop */
  shouldLoop?: boolean;
  /** Whether video should play inline on iOS */
  playsinline?: boolean;
  /** Callback when video status changes */
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
  /** Callback when video loads */
  onLoad?: () => void;
  /** Callback when video encounters an error */
  onError?: (error: string) => void;
  /** Custom styling for the container */
  className?: string;
  /** Ref to access video instance externally */
  videoRef?: React.RefObject<ExpoVideo | null>;
}

export default function VideoPlayer({
  uri,
  poster,
  autoplay = false,
  useNativeControls = true,
  showCustomControls = false,
  shouldLoop = false,
  playsinline = true,
  onPlaybackStatusUpdate,
  onLoad,
  onError,
  className = "",
  videoRef: externalRef,
}: VideoPlayerProps) {
  const internalRef = useRef<ExpoVideo | null>(null);
  const videoRef = externalRef || internalRef;
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        setIsLoading(false);
        if (onLoad) {
          onLoad();
        }
      }

      if ("error" in status && status.error) {
        setHasError(true);
        setIsLoading(false);
        const errorMessage = status.error || "Unknown video error";
        console.error("Video playback error:", errorMessage);

        if (onError) {
          onError(errorMessage);
        } else {
          Alert.alert("Video Error", "Failed to load video. Please try again.");
        }
      }

      if (onPlaybackStatusUpdate) {
        onPlaybackStatusUpdate(status);
      }
    },
    [onPlaybackStatusUpdate, onLoad, onError]
  );

  const handleError = useCallback(
    (error: string) => {
      setHasError(true);
      setIsLoading(false);
      console.error("Video error:", error);

      if (onError) {
        onError(error);
      } else {
        Alert.alert("Video Error", "Failed to load video. Please try again.");
      }
    },
    [onError]
  );

  return (
    <View className={`relative bg-black ${className}`}>
      {/* Responsive 16:9 Aspect Ratio Container */}
      <View className="w-full" style={{ aspectRatio: 16 / 9 }}>
        <ExpoVideo
          ref={videoRef}
          source={{ uri }}
          posterSource={poster ? { uri: poster } : undefined}
          shouldPlay={autoplay}
          useNativeControls={useNativeControls}
          isLooping={shouldLoop}
          resizeMode={ResizeMode.CONTAIN}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={handleError}
          style={{ flex: 1 }}
          {...(Platform.OS === "ios" && { playsinline })}
        />

        {/* Watermark */}
        <Watermark size={64} style={{ left: 8, top: 8 }} />
        {/* Loading Indicator */}
        {isLoading && !hasError && (
          <View className="absolute inset-0 flex items-center justify-center bg-black/50">
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}

        {/* Error State */}
        {hasError && (
          <View className="absolute inset-0 flex items-center justify-center bg-black">
            <View className="text-center px-4">
              <View className="text-white text-lg mb-2">
                Failed to load video
              </View>
              <View className="text-gray-400 text-sm">
                Please check your connection and try again
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// Export additional utilities for video player
export const VideoPlayerUtils = {
  /**
   * Get video instance for manual control
   */
  getVideoRef: (ref: React.RefObject<ExpoVideo | null>) => ref.current,

  /**
   * Play video programmatically
   */
  play: async (ref: React.RefObject<ExpoVideo | null>) => {
    if (ref.current) {
      try {
        await ref.current.playAsync();
      } catch (error) {
        console.error("Error playing video:", error);
      }
    }
  },

  /**
   * Pause video programmatically
   */
  pause: async (ref: React.RefObject<ExpoVideo | null>) => {
    if (ref.current) {
      try {
        await ref.current.pauseAsync();
      } catch (error) {
        console.error("Error pausing video:", error);
      }
    }
  },

  /**
   * Seek to specific position (in milliseconds)
   */
  seek: async (
    ref: React.RefObject<ExpoVideo | null>,
    positionMillis: number
  ) => {
    if (ref.current) {
      try {
        await ref.current.setPositionAsync(positionMillis);
      } catch (error) {
        console.error("Error seeking video:", error);
      }
    }
  },

  /**
   * Get current playback status
   */
  getStatus: async (ref: React.RefObject<ExpoVideo | null>) => {
    if (ref.current) {
      try {
        return await ref.current.getStatusAsync();
      } catch (error) {
        console.error("Error getting video status:", error);
        return null;
      }
    }
    return null;
  },
};
