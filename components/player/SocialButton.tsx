import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text } from "react-native";

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
}

export default function SocialButton({
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
  iconSize = 18,
}: SocialButtonProps) {
  return (
    <Pressable style={[style, isActive && activeStyle]} onPress={onPress}>
      <Ionicons
        name={isActive && activeIcon ? activeIcon : icon}
        size={iconSize}
        color={isActive ? activeIconColor : iconColor}
        style={{ marginBottom: 4 }}
      />
      <Text style={labelStyle}>{label}</Text>
      {count !== undefined && <Text style={countStyle}>{count}</Text>}
    </Pressable>
  );
}
