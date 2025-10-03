import { AVPlaybackStatus } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";

export interface VideoControlsProps {
  /** Whether controls are visible */
  visible?: boolean;
  /** Current playback status */
  playbackStatus?: AVPlaybackStatus;
  /** Whether video is playing */
  isPlaying?: boolean;
  /** Current position in milliseconds */
  positionMillis?: number;
  /** Total duration in milliseconds */
  durationMillis?: number;
  /** Current volume (0-1) */
  volume?: number;
  /** Whether video is muted */
  isMuted?: boolean;
  /** Whether video is in fullscreen */
  isFullscreen?: boolean;
  /** Available quality options */
  qualityOptions?: QualityOption[];
  /** Current quality */
  currentQuality?: string;
  /** Available playback speeds */
  speedOptions?: number[];
  /** Current playback speed */
  currentSpeed?: number;
  /** Whether controls should auto-hide */
  autoHide?: boolean;
  /** Auto-hide timeout in milliseconds */
  autoHideTimeout?: number;

  // Event handlers
  onPlayPause?: () => void;
  onSeek?: (positionMillis: number) => void;
  onVolumeChange?: (volume: number) => void;
  onMuteToggle?: () => void;
  onFullscreenToggle?: () => void;
  onQualityChange?: (quality: string) => void;
  onSpeedChange?: (speed: number) => void;
  onControlsVisibilityChange?: (visible: boolean) => void;
}

export interface QualityOption {
  label: string;
  value: string;
  resolution?: string;
}

/**
 * VideoControls - Custom video player controls overlay
 * Provides play/pause, seek, volume, fullscreen, quality, and speed controls
 */
export default function VideoControls({
  visible = true,
  playbackStatus,
  isPlaying = false,
  positionMillis = 0,
  durationMillis = 0,
  volume = 1,
  isMuted = false,
  isFullscreen = false,
  qualityOptions = [],
  currentQuality = "auto",
  speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2],
  currentSpeed = 1,
  autoHide = true,
  autoHideTimeout = 5000,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onQualityChange,
  onSpeedChange,
  onControlsVisibilityChange,
}: VideoControlsProps) {
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-hide controls
  const resetAutoHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    if (autoHide && visible) {
      hideTimeoutRef.current = setTimeout(() => {
        if (
          !isDragging &&
          !showVolumeSlider &&
          !showQualityMenu &&
          !showSpeedMenu
        ) {
          onControlsVisibilityChange?.(false);
        }
      }, autoHideTimeout);
    }
  }, [
    autoHide,
    visible,
    isDragging,
    showVolumeSlider,
    showQualityMenu,
    showSpeedMenu,
    autoHideTimeout,
    onControlsVisibilityChange,
  ]);

  useEffect(() => {
    resetAutoHideTimer();
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [resetAutoHideTimer]);

  // Animate controls visibility
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  // Format time display
  const formatTime = (timeMillis: number): string => {
    const totalSeconds = Math.floor(timeMillis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercentage =
    durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  // Handle progress bar press
  const handleProgressPress = (event: any) => {
    const { locationX, target } = event.nativeEvent;
    target.measure((_x: number, _y: number, width: number) => {
      const percentage = locationX / width;
      const newPosition = percentage * durationMillis;
      onSeek?.(newPosition);
    });
  };

  const handleControlsPress = () => {
    onControlsVisibilityChange?.(!visible);
    resetAutoHideTimer();
  };

  if (!visible) {
    return (
      <Pressable
        onPress={handleControlsPress}
        className="absolute inset-0 bg-transparent"
        style={{ zIndex: 10 }}
      />
    );
  }

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        opacity: fadeAnim,
      }}
      className="flex-1"
      onTouchStart={resetAutoHideTimer}
    >
      {/* Overlay Background */}
      <Pressable
        onPress={handleControlsPress}
        className="absolute inset-0 bg-black/20"
      />

      {/* Top Controls */}
      <View className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <View className="flex-row items-center justify-between">
          {/* Back Button */}
          <Pressable className="p-2">
            <Text className="text-white text-lg">←</Text>
          </Pressable>

          {/* Right Side Controls */}
          <View className="flex-row items-center gap-3">
            {/* Quality Selector */}
            {qualityOptions.length > 0 && (
              <View className="relative">
                <Pressable
                  onPress={() => {
                    setShowQualityMenu(!showQualityMenu);
                    resetAutoHideTimer();
                  }}
                  className="px-3 py-1 bg-black/40 rounded"
                >
                  <Text className="text-white text-sm font-medium">
                    {currentQuality.toUpperCase()}
                  </Text>
                </Pressable>

                {showQualityMenu && (
                  <View className="absolute top-full right-0 mt-1 bg-black/80 rounded min-w-20">
                    {qualityOptions.map((option) => (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          onQualityChange?.(option.value);
                          setShowQualityMenu(false);
                          resetAutoHideTimer();
                        }}
                        className="px-3 py-2 border-b border-gray-600 last:border-b-0"
                      >
                        <Text
                          className={`text-sm ${
                            currentQuality === option.value
                              ? "text-blue-400"
                              : "text-white"
                          }`}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Speed Control */}
            <View className="relative">
              <Pressable
                onPress={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  resetAutoHideTimer();
                }}
                className="px-3 py-1 bg-black/40 rounded"
              >
                <Text className="text-white text-sm font-medium">
                  {currentSpeed}x
                </Text>
              </Pressable>

              {showSpeedMenu && (
                <View className="absolute top-full right-0 mt-1 bg-black/80 rounded min-w-16">
                  {speedOptions.map((speed) => (
                    <Pressable
                      key={speed}
                      onPress={() => {
                        onSpeedChange?.(speed);
                        setShowSpeedMenu(false);
                        resetAutoHideTimer();
                      }}
                      className="px-3 py-2 border-b border-gray-600 last:border-b-0"
                    >
                      <Text
                        className={`text-sm ${
                          currentSpeed === speed
                            ? "text-blue-400"
                            : "text-white"
                        }`}
                      >
                        {speed}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Center Play/Pause Button */}
      <View className="absolute inset-0 flex items-center justify-center">
        <Pressable
          onPress={() => {
            onPlayPause?.();
            resetAutoHideTimer();
          }}
          className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center"
        >
          <Text className="text-white text-2xl">{isPlaying ? "⏸️" : "▶️"}</Text>
        </Pressable>
      </View>

      {/* Bottom Controls */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
        {/* Progress Bar */}
        <Pressable
          onPress={handleProgressPress}
          className="mb-4 h-1 bg-white/30 rounded-full overflow-hidden"
        >
          <View
            className="h-full bg-red-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </Pressable>

        {/* Bottom Row Controls */}
        <View className="flex-row items-center justify-between">
          {/* Left Side - Time */}
          <Text className="text-white text-sm">
            {formatTime(positionMillis)} / {formatTime(durationMillis)}
          </Text>

          {/* Right Side Controls */}
          <View className="flex-row items-center gap-4">
            {/* Volume Control */}
            <View className="relative">
              <Pressable
                onPress={() => {
                  setShowVolumeSlider(!showVolumeSlider);
                  resetAutoHideTimer();
                }}
                className="p-2"
              >
                <Text className="text-white text-lg">
                  {isMuted || volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
                </Text>
              </Pressable>

              {showVolumeSlider && (
                <View className="absolute bottom-full right-0 mb-2 w-24 h-1 bg-white/30 rounded-full">
                  <View
                    className="h-full bg-white rounded-full"
                    style={{ width: `${volume * 100}%` }}
                  />
                </View>
              )}
            </View>

            {/* Fullscreen Toggle */}
            <Pressable
              onPress={() => {
                onFullscreenToggle?.();
                resetAutoHideTimer();
              }}
              className="p-2"
            >
              <Text className="text-white text-lg">
                {isFullscreen ? "⏹️" : "⛶"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// Export additional utilities
export const VideoControlsUtils = {
  /**
   * Create default quality options
   */
  createDefaultQualityOptions: (): QualityOption[] => [
    { label: "Auto", value: "auto" },
    { label: "1080p HD", value: "1080p", resolution: "1920x1080" },
    { label: "720p HD", value: "720p", resolution: "1280x720" },
    { label: "480p", value: "480p", resolution: "854x480" },
    { label: "360p", value: "360p", resolution: "640x360" },
    { label: "240p", value: "240p", resolution: "426x240" },
  ],

  /**
   * Create default speed options
   */
  createDefaultSpeedOptions: (): number[] => [
    0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2,
  ],

  /**
   * Format duration from seconds to readable string
   */
  formatDuration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  },

  /**
   * Calculate buffer percentage from playback status
   */
  getBufferPercentage: (status: AVPlaybackStatus): number => {
    if (
      status.isLoaded &&
      status.durationMillis &&
      status.playableDurationMillis
    ) {
      return (status.playableDurationMillis / status.durationMillis) * 100;
    }
    return 0;
  },
};
