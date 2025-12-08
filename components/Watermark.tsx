import React from "react";
import {
  Image,
  ImageStyle,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";

type WatermarkProps = {
  size?: number;
  style?: any;
  source?: any;
};

const DEFAULT_LOGO = require("../assets/images/af-logo-light.png");

export default function Watermark({
  size = 88,
  style,
  source,
}: WatermarkProps) {
  const topOffset =
    Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 8 : 12;
  const imageHeight = Math.round(size * 0.28);

  return (
    <View
      pointerEvents="none"
      style={[styles.container, { top: topOffset, left: 12 }, style]}
    >
      <Image
        source={source || DEFAULT_LOGO}
        style={[
          {
            width: size,
            height: imageHeight,
            resizeMode: "contain",
            opacity: 0.92,
          } as ImageStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 1000,
    overflow: "hidden",
  },
});
