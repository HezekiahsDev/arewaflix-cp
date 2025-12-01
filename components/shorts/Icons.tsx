import React from "react";
import Svg, { Path } from "react-native-svg";

const IconDefaults = { size: 28, color: "#fff" } as const;

export const HeartIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
        fill={color}
      />
    </Svg>
  )
);

export const CommentIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        fill={color}
      />
    </Svg>
  )
);

export const VolumeIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 5L6 9H2v6h4l5 4V5z" fill={color} />
      <Path
        d="M19 8a5 5 0 0 1 0 8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
);

export const VolumeOffIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 5L6 9H2v6h4l5 4V5z" fill={color} />
      <Path
        d="M23 3L3 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
);

export const ReportIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
  }: {
    size?: number;
    color?: string;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        fill={color}
      />
      <Path d="M12 9v4" stroke="#000" strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M12 17h.01"
        stroke="#000"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  )
);

export const SaveIcon = React.memo(
  ({
    size = IconDefaults.size,
    color = IconDefaults.color,
    filled = false,
  }: {
    size?: number;
    color?: string;
    filled?: boolean;
  }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
);

export default {
  HeartIcon,
  CommentIcon,
  VolumeIcon,
  VolumeOffIcon,
  ReportIcon,
  SaveIcon,
};
