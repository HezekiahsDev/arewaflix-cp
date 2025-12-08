import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Video as ExpoVideo, ResizeMode } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Watermark from "./Watermark";

interface FullscreenPlayerProps {
  visible: boolean;
  videoUri: string;
  poster?: string;
  title?: string;
  onClose: () => void;
  initialPosition?: number;
  onPlaybackUpdate?: (position: number, isPlaying: boolean) => void;
  onSeek?: (deltaMillis: number) => void;
  onSeekTo?: (positionMillis: number) => void;
}

const AUTO_HIDE_DELAY = 3000;

export default function FullscreenPlayer({
  visible,
  videoUri,
  poster,
  title = "Video Player",
  onClose,
  initialPosition = 0,
  onPlaybackUpdate,
  onSeek,
  onSeekTo,
}: FullscreenPlayerProps) {
  const videoRef = useRef<ExpoVideo | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Lock to landscape when fullscreen is visible
  useEffect(() => {
    if (visible) {
      (async () => {
        try {
          // Lock to landscape when entering fullscreen
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.LANDSCAPE
          );
          // Hide status bar for immersive experience
          StatusBar.setHidden(true, "fade");
        } catch (error) {
          console.error("Failed to lock orientation:", error);
        }
      })();
    } else {
      // Restore orientation and status bar when exiting
      (async () => {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP
          );
          StatusBar.setHidden(false, "fade");
        } catch (error) {
          console.error("Failed to restore orientation:", error);
        }
      })();
    }
  }, [visible]);

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleClose();
        return true;
      }
    );

    return () => backHandler.remove();
  }, [visible]);

  // Auto-hide controls
  const clearHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideControlsTimeout();
    if (isPlaying && !hasFinished) {
      hideControlsTimeout.current = setTimeout(() => {
        setControlsVisible(false);
      }, AUTO_HIDE_DELAY);
    }
  }, [clearHideControlsTimeout, isPlaying, hasFinished]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  const hideControls = useCallback(() => {
    setControlsVisible(false);
    clearHideControlsTimeout();
  }, [clearHideControlsTimeout]);

  // Animate controls opacity
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: controlsVisible ? 250 : 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [controlsVisible]);

  // Schedule auto-hide when playing
  useEffect(() => {
    if (isPlaying && controlsVisible && !hasFinished) {
      scheduleHideControls();
    } else {
      clearHideControlsTimeout();
    }

    return () => clearHideControlsTimeout();
  }, [
    isPlaying,
    controlsVisible,
    hasFinished,
    scheduleHideControls,
    clearHideControlsTimeout,
  ]);

  // Show controls when video finishes
  useEffect(() => {
    if (hasFinished) {
      setControlsVisible(true);
      clearHideControlsTimeout();
    }
  }, [hasFinished, clearHideControlsTimeout]);

  // Set initial position when video loads
  const _initialSetTries = useRef(0);

  // Set initial position when video loads — retry a few times if native view
  // isn't yet registered. This prevents `Invalid view returned from registry`
  // errors when the native EXVideo hasn't been mounted yet.
  useEffect(() => {
    let cancelled = false;
    _initialSetTries.current = 0;

    const attemptSet = async () => {
      if (cancelled) return;
      if (!visible || !isLoaded || initialPosition <= 0) return;

      const video = videoRef.current as any;

      if (!video || typeof video.setPositionAsync !== "function") {
        if (_initialSetTries.current < 5) {
          _initialSetTries.current += 1;
          setTimeout(attemptSet, 150);
        }
        return;
      }

      try {
        await video.setPositionAsync(initialPosition);
      } catch (err: any) {
        const msg = String(err?.message ?? err ?? "");
        // Retry on known registry timing issue
        if (
          _initialSetTries.current < 5 &&
          msg.includes("Invalid view returned from registry")
        ) {
          _initialSetTries.current += 1;
          setTimeout(attemptSet, 150);
        } else {
          console.error("Failed to set initial position:", err);
        }
      }
    };

    attemptSet();

    return () => {
      cancelled = true;
    };
  }, [visible, isLoaded, initialPosition]);

  // Update parent component with playback state
  useEffect(() => {
    if (onPlaybackUpdate && isLoaded) {
      onPlaybackUpdate(positionMillis, isPlaying);
    }
  }, [positionMillis, isPlaying, isLoaded, onPlaybackUpdate]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: any) => {
      if (status.isLoaded) {
        setIsLoaded(true);
        setIsPlaying(status.isPlaying);
        setIsBuffering(status.isBuffering);
        setDurationMillis(status.durationMillis || 0);
        setHasFinished(status.didJustFinish || false);

        if (!isSeeking) {
          setPositionMillis(status.positionMillis || 0);
          setSeekPosition(status.positionMillis || 0);
        }
      } else if (status.error) {
        setVideoError(status.error);
        setIsBuffering(false);
      }
    },
    [isSeeking]
  );

  const isVideoRefReady = useCallback(() => {
    try {
      return Boolean(
        videoRef.current &&
        typeof (videoRef.current as any).setPositionAsync === "function"
      );
    } catch (e) {
      return false;
    }
  }, []);

  const handleTogglePlay = useCallback(async () => {
    if (!isVideoRefReady() || !isLoaded) return;

    try {
      if (hasFinished) {
        await (videoRef.current as any).setPositionAsync(0);
        await (videoRef.current as any).playAsync();
        setHasFinished(false);
      } else if (isPlaying) {
        await (videoRef.current as any).pauseAsync();
      } else {
        await (videoRef.current as any).playAsync();
      }
      showControls();
    } catch (error) {
      console.error("Failed to toggle playback:", error);
    }
  }, [isLoaded, isPlaying, hasFinished, showControls]);

  const handleSeek = useCallback(
    async (deltaMillis: number) => {
      if (!isVideoRefReady() || !isLoaded) return;

      try {
        // Get the freshest native position to avoid stale JS state
        const status = await (videoRef.current as any).getStatusAsync();
        const currentPos =
          (status && status.positionMillis) || positionMillis || 0;
        const newPosition = Math.max(
          0,
          Math.min(durationMillis, currentPos + deltaMillis)
        );
        await (videoRef.current as any).setPositionAsync(newPosition);
        // Inform parent about the new position so the main player can sync too
        try {
          if (onSeekTo) onSeekTo(newPosition);
        } catch (e) {
          // ignore
        }
        showControls();
      } catch (error) {
        console.error("Failed to seek:", error);
      }
    },
    [isLoaded, positionMillis, durationMillis, showControls, onSeekTo]
  );

  const handleSlidingStart = useCallback(() => {
    setIsSeeking(true);
    clearHideControlsTimeout();
  }, [clearHideControlsTimeout]);

  const handleSlidingComplete = useCallback(
    async (value: number) => {
      if (!isVideoRefReady() || !isLoaded) {
        setIsSeeking(false);
        return;
      }

      try {
        await (videoRef.current as any).setPositionAsync(value);
        // Sync parent player position as well
        try {
          if (onSeekTo) onSeekTo(value);
        } catch (e) {
          // ignore
        }
      } catch (error) {
        console.error("Failed to seek:", error);
      } finally {
        setIsSeeking(false);
        scheduleHideControls();
      }
    },
    [isLoaded, scheduleHideControls, onSeekTo]
  );

  const handleSliderValueChange = useCallback((value: number) => {
    setSeekPosition(value);
  }, []);

  const handleClose = useCallback(async () => {
    // Pause video before closing
    if (isVideoRefReady() && isPlaying) {
      try {
        await (videoRef.current as any).pauseAsync();
      } catch (error) {
        console.error("Failed to pause video:", error);
      }
    }
    onClose();
  }, [isPlaying, onClose]);

  const handleVideoTap = useCallback(() => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControls();
    }
  }, [controlsVisible, hideControls, showControls]);

  const formatTime = (millis: number): string => {
    if (!Number.isFinite(millis) || millis < 0) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressValue = isSeeking ? seekPosition : positionMillis;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
      supportedOrientations={["landscape"]}
      statusBarTranslucent
    >
      {/* Black backdrop to ensure fullscreen background is pure black */}
      <View style={styles.backdrop} />
      <View style={styles.container}>
        {/* Video Container */}
        <View style={styles.videoWrapper}>
          <ExpoVideo
            ref={videoRef}
            style={styles.video}
            source={{ uri: videoUri }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            volume={1}
            isMuted={false}
            usePoster={Boolean(poster)}
            posterSource={poster ? { uri: poster } : undefined}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(error) => setVideoError(error)}
          />

          {/* Watermark */}
          <Watermark style={{ left: 12 }} size={96} />

          {/* Buffering Overlay */}
          {isBuffering && (
            <View style={styles.bufferOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.bufferText}>Loading...</Text>
            </View>
          )}

          {/* Error Overlay */}
          {videoError && (
            <View style={styles.errorOverlay}>
              <Ionicons name="alert-circle-outline" size={48} color="#fff" />
              <Text style={styles.errorText}>Failed to load video</Text>
              <Pressable style={styles.retryButton} onPress={handleClose}>
                <Text style={styles.retryButtonText}>Close</Text>
              </Pressable>
            </View>
          )}

          {/* Touch area for showing/hiding controls */}
          <Pressable
            style={styles.touchArea}
            onPress={handleVideoTap}
            pointerEvents={controlsVisible ? "none" : "auto"}
          />

          {/* Controls Overlay */}
          <Animated.View
            style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
            pointerEvents={controlsVisible ? "box-none" : "none"}
          >
            {/* Top Gradient */}
            <LinearGradient
              colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0.4)", "transparent"]}
              style={styles.topGradient}
              pointerEvents="box-none"
            />

            {/* Top Bar */}
            <View style={styles.topBar}>
              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={28} color="#fff" />
              </Pressable>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <View style={styles.topBarSpacer} />
            </View>

            {/* Center Controls */}
            <View style={styles.centerControls} pointerEvents="box-none">
              {hasFinished ? (
                <Pressable
                  style={styles.replayButton}
                  onPress={handleTogglePlay}
                >
                  <Ionicons name="reload" size={48} color="#fff" />
                  <Text style={styles.replayText}>Replay</Text>
                </Pressable>
              ) : (
                <View style={styles.playbackControls}>
                  <Pressable
                    style={styles.seekButton}
                    onPress={() => handleSeek(-10000)}
                    disabled={!isLoaded || isBuffering}
                  >
                    <Ionicons name="play-back" size={36} color="#fff" />
                    <Text style={styles.seekText}>10</Text>
                  </Pressable>

                  <Pressable
                    style={styles.playButton}
                    onPress={handleTogglePlay}
                    disabled={!isLoaded}
                  >
                    <View style={styles.playButtonInner}>
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={42}
                        color="#fff"
                      />
                    </View>
                  </Pressable>

                  <Pressable
                    style={styles.seekButton}
                    onPress={() => handleSeek(10000)}
                    disabled={!isLoaded || isBuffering}
                  >
                    <Ionicons name="play-forward" size={36} color="#fff" />
                    <Text style={styles.seekText}>10</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Bottom Gradient */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.8)"]}
              style={styles.bottomGradient}
              pointerEvents="box-none"
            />

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
              <View style={styles.progressContainer}>
                <Slider
                  style={styles.slider}
                  value={progressValue}
                  minimumValue={0}
                  maximumValue={durationMillis}
                  onSlidingStart={handleSlidingStart}
                  onSlidingComplete={handleSlidingComplete}
                  onValueChange={handleSliderValueChange}
                  disabled={!isLoaded || isBuffering}
                  minimumTrackTintColor="#38bdf8"
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor="#38bdf8"
                />
              </View>
              <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                  {formatTime(progressValue)} / {formatTime(durationMillis)}
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  videoWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  bufferOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  bufferText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#38bdf8",
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  touchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 24 : 44,
    paddingBottom: 12,
    gap: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  topBarSpacer: {
    width: 44,
  },
  centerControls: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  playbackControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 48,
  },
  seekButton: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.9,
  },
  seekText: {
    position: "absolute",
    bottom: 8,
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  playButton: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  replayButton: {
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  replayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "android" ? 16 : 24,
    gap: 8,
  },
  progressContainer: {
    width: "100%",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  timeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 0,
  },
});
