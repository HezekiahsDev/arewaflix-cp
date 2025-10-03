import { AVPlaybackStatus, Video as ExpoVideo, ResizeMode } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AlertButton,
  BackHandler,
  Image,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_TITLE = "Now playing";
const BUFFERING_TIMEOUT_MS = 12_000;

type ResolvedSource =
  | {
      uri: string;
      origin: "direct";
    }
  | {
      uri: null;
      watchUrl: string;
      videoId: string;
      origin: "external";
    };

type PlayerParams = {
  uri?: string;
  title?: string;
  poster?: string;
  source?: string;
  videoId?: string;
  watchUrl?: string;
};

export default function PlayerScreen() {
  const { uri, title, poster, source, videoId, watchUrl } =
    useLocalSearchParams<PlayerParams>();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const playableUri = useMemo(
    () => (typeof uri === "string" && uri.trim() ? uri : null),
    [uri]
  );

  const [resolvedSource, setResolvedSource] = useState<ResolvedSource | null>(
    () => (playableUri ? { uri: playableUri, origin: "direct" } : null)
  );

  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState<boolean>(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    console.log("[Player] Resolving video:", {
      playableUri,
      videoId,
      watchUrl,
      title,
    });

    if (playableUri) {
      console.log("[Player] Using direct URI:", playableUri);
      setResolvedSource({ uri: playableUri, origin: "direct" });
      setResolveError(null);
    } else if (videoId && watchUrl) {
      console.log(
        "[Player] External video detected, will open in browser:",
        watchUrl
      );
      setResolvedSource({
        uri: null,
        watchUrl,
        videoId,
        origin: "external",
      });
      setResolveError(null);
      // Auto-open external video in browser
      void Linking.openURL(watchUrl).catch((error) => {
        console.error("[Player] Failed to open external URL:", error);
        setResolveError("Unable to open video in browser.");
      });
    } else {
      console.log("[Player] No playable source found");
      setResolvedSource(null);
      setResolveError("We couldn't load this video right now.");
    }
  }, [playableUri, videoId, watchUrl, title]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.back();
        return true;
      }
    );

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowControls(true);
      setIsBuffering(false);
    }, BUFFERING_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!playableUri) {
      Alert.alert(
        "No video",
        "We couldn't find a playable video for this short.",
        [{ text: "Go back", onPress: () => router.back() }]
      );
    }
  }, [playableUri, router]);

  useEffect(() => {
    setIsBuffering(resolvedSource !== null);
    setHasError(false);
  }, [resolvedSource?.uri]);

  const displayTitle = useMemo(
    () =>
      typeof title === "string" && title.trim() ? title.trim() : DEFAULT_TITLE,
    [title]
  );

  const fallbackUrl = useMemo(() => {
    if (resolvedSource?.origin === "external") {
      return resolvedSource.watchUrl;
    }
    if (typeof source === "string" && source.trim()) {
      return source.trim();
    }
    if (playableUri) {
      return playableUri;
    }
    return null;
  }, [playableUri, source, resolvedSource]);

  const handleToggleControls = useCallback(() => {
    setShowControls((value) => !value);
  }, []);

  const handlePlayableFallback = useCallback(() => {
    if (!fallbackUrl) return;
    void Linking.openURL(fallbackUrl).catch((error) => {
      console.error("[PlayerScreen] Failed to open URL", error);
      Alert.alert(
        "Unable to open",
        "We couldn't open this link in another app right now."
      );
    });
  }, [fallbackUrl]);

  const handlePlaybackError = useCallback(() => {
    setHasError(true);
    setIsBuffering(false);

    const buttons: AlertButton[] = fallbackUrl
      ? [
          { text: "Close", style: "cancel" },
          { text: "Open link", onPress: handlePlayableFallback },
        ]
      : [{ text: "Close", style: "cancel" }];

    Alert.alert(
      "Playback error",
      "We couldn't play this video. Please try again later.",
      buttons
    );
  }, [fallbackUrl, handlePlayableFallback]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status || !status.isLoaded) {
      return;
    }

    setIsBuffering(status.isBuffering ?? false);
  }, []);

  const controlsVisible = resolvedSource !== null ? showControls : false;
  const posterVisible = Boolean(
    poster && (isBuffering || hasError || !resolvedSource)
  );

  const badgeLabel =
    resolvedSource?.origin === "external" ? "External Video" : "Direct Video";

  const showUnavailableOverlay = !resolvedSource && resolveError !== null;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        paddingTop:
          Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0,
      }}
    >
      {resolvedSource && resolvedSource.origin === "direct" ? (
        <Pressable
          style={{ flex: 1 }}
          onPress={handleToggleControls}
          accessibilityRole="button"
          accessibilityLabel="Toggle playback controls"
        >
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: posterVisible ? 1 : 0,
              }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}

          <ExpoVideo
            style={{ flex: 1 }}
            source={{ uri: resolvedSource.uri }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={!hasError}
            isLooping
            onError={handlePlaybackError}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          />
        </Pressable>
      ) : resolvedSource && resolvedSource.origin === "external" ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            paddingHorizontal: 24,
          }}
        >
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.5,
              }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}

          <View
            style={{
              paddingHorizontal: 24,
              paddingVertical: 18,
              borderRadius: 16,
              backgroundColor: "rgba(0,0,0,0.8)",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: "600",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Opening in Browser
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              This video will open in your default browser for the best viewing
              experience.
            </Text>
            <Pressable
              onPress={() => Linking.openURL(resolvedSource.watchUrl)}
              style={{
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.2)",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Open Video
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            paddingHorizontal: 24,
          }}
        >
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: posterVisible ? 1 : 0,
              }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}

          {showUnavailableOverlay ? (
            <View
              style={{
                paddingHorizontal: 24,
                paddingVertical: 18,
                borderRadius: 16,
                backgroundColor: "rgba(0,0,0,0.7)",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {resolveError ?? "This short is currently unavailable."}
              </Text>
              {fallbackUrl ? (
                <Pressable
                  onPress={handlePlayableFallback}
                  style={{
                    marginTop: 12,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.18)",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    Open in browser
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      )}

      {controlsVisible ? (
        <View
          style={{
            position: "absolute",
            top: insets.top + 12,
            left: 16,
            right: 16,
            paddingBottom: 12,
            backgroundColor: "rgba(0,0,0,0.45)",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Pressable onPress={() => router.back()} accessibilityRole="button">
              <Text style={{ color: "#fff", fontSize: 16 }}>Close</Text>
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  marginRight: 10,
                  backgroundColor: "rgba(0,0,0,0.45)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {badgeLabel}
                </Text>
              </View>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: "600",
                  maxWidth: "60%",
                  textAlign: "right",
                }}
                numberOfLines={2}
              >
                {displayTitle}
              </Text>
            </View>
          </View>
          {fallbackUrl ? (
            <Pressable
              onPress={handlePlayableFallback}
              style={{
                marginTop: 12,
                alignSelf: "flex-start",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.16)",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: "600",
                }}
              >
                Open externally
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isBuffering && resolvedSource && resolvedSource.origin === "direct" ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : null}
    </View>
  );
}
