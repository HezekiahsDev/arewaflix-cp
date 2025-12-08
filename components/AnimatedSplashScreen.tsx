import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface AnimatedSplashScreenProps {
  onFinish: () => void;
}

export default function AnimatedSplashScreen({
  onFinish,
}: AnimatedSplashScreenProps) {
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const timeoutsRef = useRef<number[] | null>(null);
  const finishTimeouts = useRef<number[] | null>(null);

  useEffect(() => {
    console.debug("AnimatedSplashScreen: mounted");
    // Reveal the React view so the custom animated splash can be seen.
    // The app previously called `SplashScreen.preventAutoHideAsync()` at
    // startup; hide the native splash here to show the animated one.
    SplashScreen.hideAsync().catch(() => {
      // ignore if already hidden or not available
    });

    // Animate logo entrance (slower and smoother)
    logoScale.value = withSpring(1, {
      damping: 14,
      stiffness: 80,
    });
    logoOpacity.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.exp),
    });

    // Animate text after logo (delayed and slower)
    const textTimeout = setTimeout(() => {
      console.debug("AnimatedSplashScreen: showing text");
      textOpacity.value = withTiming(1, { duration: 1000 });
      textTranslateY.value = withSpring(0, {
        damping: 16,
        stiffness: 80,
      });
    }, 1200);

    // Fade out and finish after 5s
    const fadeTimeout = setTimeout(() => {
      console.debug("AnimatedSplashScreen: starting fade out");
      logoOpacity.value = withTiming(0, { duration: 700 });
      textOpacity.value = withTiming(0, { duration: 700 });

      const finishTimeout = setTimeout(() => {
        console.debug("AnimatedSplashScreen: calling onFinish");
        onFinish();
      }, 700);

      // Track nested finish timeout
      finishTimeouts.current = [
        ...(finishTimeouts.current ?? []),
        finishTimeout as unknown as number,
      ];
    }, 5000);

    // track timeouts so we can clear them on unmount
    timeoutsRef.current = [
      textTimeout as unknown as number,
      fadeTimeout as unknown as number,
    ];

    return () => {
      console.debug("AnimatedSplashScreen: unmounting, clearing timeouts");
      timeoutsRef.current?.forEach((id) => clearTimeout(id));
      finishTimeouts.current?.forEach((id) => clearTimeout(id));
    };
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require("../assets/images/af-logo-light.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
        <Text style={styles.subtitle}>Entertainment at your fingertips</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 300,
    height: 300,
  },
  textContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    width: "100%",
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
});
