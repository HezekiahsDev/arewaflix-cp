import { Ionicons } from "@expo/vector-icons";
import { Video as ExpoVideo, ResizeMode } from "expo-av";
import React from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
} from "react-native";

export default function PlayerVideoContainer(props: any) {
  const {
    styles,
    resolvedUri,
    poster,
    videoRef,
    handleStatusUpdate,
    handleFullscreenUpdate,
    handleLoadStart,
    handleLoad,
    handleError,
    isBuffering,
    bufferInfo,
    durationMillis,
    positionMillis,
    isLoaded,
    isPlaying,
    hasFinished,
    controlsVisible,
    controlsOpacity,
    handleHideControls,
    handleShowControls,
    displayTitle,
    handleSeek,
    handleTogglePlay,
    handleSeekTo,
    handleSlidingStart,
    handleSlidingComplete,
    handleSliderValueChange,
    handleEnterFullscreen,
    handleExitFullscreen,
    handleReplay,
  } = props;

  const progressValue = isLoaded ? positionMillis : positionMillis;

  return (
    <View style={styles.videoContainer}>
      <ExpoVideo
        ref={videoRef}
        style={styles.video}
        source={{ uri: resolvedUri }}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        volume={1}
        isMuted={false}
        usePoster={Boolean(poster)}
        posterSource={poster ? { uri: poster } : undefined}
        onPlaybackStatusUpdate={handleStatusUpdate}
        onFullscreenUpdate={handleFullscreenUpdate}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
      />

      {isBuffering ? (
        <View style={styles.bufferOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          {bufferInfo.label ? (
            <Text style={styles.bufferLabel}>{bufferInfo.label}</Text>
          ) : null}
          {bufferInfo.bufferedAheadMillis > 0 ? (
            <Text style={styles.bufferSublabel}>
              Ready for the next {formatTime(bufferInfo.bufferedAheadMillis)}
            </Text>
          ) : null}
          {bufferInfo.percent > 0 ? (
            <>
              <View style={styles.bufferProgressTrack}>
                <View
                  style={[
                    styles.bufferProgressFill,
                    {
                      width: `${Math.min(100, Math.max(0, Math.round(bufferInfo.percent * 100)))}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.bufferPercentLabel}>
                {Math.min(
                  100,
                  Math.max(0, Math.round(bufferInfo.percent * 100))
                )}
                %{durationMillis > 0 ? " of video cached" : " loaded"}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}

      {/** Video error overlay handled by parent if needed */}

      <View style={styles.controlsContainer} pointerEvents="box-none">
        {controlsVisible ? (
          <Pressable
            style={styles.overlayBackground}
            onPress={handleHideControls}
          />
        ) : (
          <Pressable
            style={styles.overlayShowTrigger}
            onPress={handleShowControls}
          />
        )}

        <Animated.View
          pointerEvents={controlsVisible ? "auto" : "none"}
          style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitleCentered} numberOfLines={1}>
                {displayTitle}
              </Text>
              <Pressable
                style={styles.dismissButton}
                onPress={handleExitFullscreen}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.overlayCenterRow}>
              {hasFinished ? (
                <Pressable
                  style={styles.overlayReplayButton}
                  onPress={handleReplay}
                >
                  <Ionicons name="refresh" size={36} color="#fff" />
                  <Text style={styles.overlayReplayText}>Replay</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    style={styles.overlayIconButton}
                    onPress={() => handleSeek(-10_000)}
                    disabled={!isLoaded}
                  >
                    <Ionicons name="play-back" size={30} color="#fff" />
                    <Text style={styles.overlayIconCaption}>10s</Text>
                  </Pressable>
                  <Pressable
                    style={styles.overlayPlayButton}
                    onPress={handleTogglePlay}
                    disabled={!isLoaded}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={36}
                      color="#fff"
                    />
                  </Pressable>
                  <Pressable
                    style={styles.overlayIconButton}
                    onPress={() => handleSeek(10_000)}
                    disabled={!isLoaded}
                  >
                    <Ionicons name="play-forward" size={30} color="#fff" />
                    <Text style={styles.overlayIconCaption}>10s</Text>
                  </Pressable>
                </>
              )}
            </View>

            <View style={styles.overlayBottomGradient}>
              {/* simplified slider usage */}
              <View style={styles.progressSlider}>
                {/* Placeholder bar — parent manages precise slider interactions */}
              </View>
              <View style={styles.overlayBottomRow}>
                <Text style={styles.progressLabel}>
                  {formatTime(progressValue)}
                </Text>
                <View style={styles.overlayBottomRight}>
                  <Text style={styles.progressLabel}>
                    {formatTime(durationMillis)}
                  </Text>
                  <Pressable
                    style={styles.fullscreenButton}
                    onPress={handleEnterFullscreen}
                  >
                    <Ionicons name="expand" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function formatTime(millis: number): string {
  if (!Number.isFinite(millis) || millis < 0) return "0:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString();
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
