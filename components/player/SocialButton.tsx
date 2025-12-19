import { Ionicons } from "@expo/vector-icons";
import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SocialButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  isActive?: boolean;
  onPress: () => void;
  style?: any;
  activeStyle?: any;
  labelStyle?: any;
  countStyle?: any;
  iconColor?: string;
  activeIconColor?: string;
  iconSize?: number;
  disabled?: boolean;
}

function SocialButton({
  icon,
  activeIcon,
  label,
  count,
  isActive = false,
  onPress,
  style,
  activeStyle,
  labelStyle,
  countStyle,
  iconColor = "#fff",
  activeIconColor = "#ff3b30",
  iconSize = 20,
  disabled = false,
}: SocialButtonProps) {
  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [disabled, onPress]);

  const accessibilityLabel = `${label}${count !== undefined ? `, ${count} ${label.toLowerCase()}s` : ""}`;
  const accessibilityState = { disabled, selected: isActive };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [
        styles.root,
        style,
        isActive && activeStyle,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      android_ripple={{
        color: "rgba(255,255,255,0.15)",
        borderless: false,
      }}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={isActive && activeIcon ? activeIcon : icon}
          size={iconSize}
          color={
            disabled
              ? "rgba(255,255,255,0.3)"
              : isActive
                ? activeIconColor
                : iconColor
          }
        />
      </View>
      <Text
        style={[styles.label, labelStyle, disabled && styles.disabledText]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <Text
          style={[styles.count, countStyle, disabled && styles.disabledText]}
          numberOfLines={1}
        >
          {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
        </Text>
      )}
    </Pressable>
  );
}

export default memo(SocialButton);

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 72,
    borderRadius: 12,
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.5,
  },
  iconWrap: {
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center",
    height: 24,
  },
  label: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  count: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 3,
    fontWeight: "400",
    textAlign: "center",
  },
  disabledText: {
    color: "rgba(255,255,255,0.3)",
  },
});
