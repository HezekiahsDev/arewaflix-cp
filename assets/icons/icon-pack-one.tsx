import React from "react";
import type { SvgProps } from "react-native-svg";
import Svg, { Path } from "react-native-svg";

export interface IconProps extends SvgProps {
  size?: number;
  strokeColor?: string;
  accentColor?: string;
  strokeWidth?: number;
  color?: string;
}

type ResolvedIconColors = {
  stroke: string;
  accent: string;
  strokeWidth: number;
};

type IconRenderer = (colors: ResolvedIconColors) => React.ReactNode;

type IconComponent = React.FC<IconProps>;

const DEFAULT_COLOR = "#111827";

const createIcon = (render: IconRenderer): IconComponent => {
  const Icon: IconComponent = ({
    size = 24,
    color,
    strokeColor,
    accentColor,
    strokeWidth = 2,
    ...svgProps
  }) => {
    const resolvedStroke = strokeColor ?? color ?? DEFAULT_COLOR;
    const resolvedAccent = accentColor ?? color ?? resolvedStroke;

    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        {...svgProps}
      >
        {render({
          stroke: resolvedStroke,
          accent: resolvedAccent,
          strokeWidth,
        })}
      </Svg>
    );
  };

  Icon.displayName = "IconPackOne";

  return Icon;
};

/**
 * Star + small bars icon converted from provided SVG.
 * - Uses `currentColor` semantics by passing color via props
 * - Fill paths use `accent` color; strokes use `stroke` color
 */
export const StarBarsIcon = createIcon(({ stroke, accent, strokeWidth }) => (
  <>
    <Path
      d="M15.3895 5.21125L16.7995 8.03125C16.9895 8.42125 17.4995 8.79125 17.9295 8.87125L20.4795 9.29125C22.1095 9.56125 22.4895 10.7413 21.3195 11.9213L19.3295 13.9113C18.9995 14.2413 18.8095 14.8913 18.9195 15.3613L19.4895 17.8213C19.9395 19.7613 18.8995 20.5213 17.1895 19.5013L14.7995 18.0813C14.3695 17.8213 13.6495 17.8213 13.2195 18.0813L10.8295 19.5013C9.11945 20.5113 8.07945 19.7613 8.52945 17.8213L9.09945 15.3613C9.18945 14.8813 8.99945 14.2313 8.66945 13.9013L6.67945 11.9113C5.50945 10.7413 5.88945 9.56125 7.51945 9.28125L10.0695 8.86125C10.4995 8.79125 11.0095 8.41125 11.1995 8.02125L12.6095 5.20125C13.3795 3.68125 14.6195 3.68125 15.3895 5.21125Z"
      fill={accent}
    />
    <Path
      d="M8 5.75H2C1.59 5.75 1.25 5.41 1.25 5C1.25 4.59 1.59 4.25 2 4.25H8C8.41 4.25 8.75 4.59 8.75 5C8.75 5.41 8.41 5.75 8 5.75Z"
      fill={accent}
    />
    <Path
      d="M5 19.75H2C1.59 19.75 1.25 19.41 1.25 19C1.25 18.59 1.59 18.25 2 18.25H5C5.41 18.25 5.75 18.59 5.75 19C5.75 19.41 5.41 19.75 5 19.75Z"
      fill={accent}
    />
    <Path
      d="M3 12.75H2C1.59 12.75 1.25 12.41 1.25 12C1.25 11.59 1.59 11.25 2 11.25H3C3.41 11.25 3.75 11.59 3.75 12C3.75 12.41 3.41 12.75 3 12.75Z"
      fill={accent}
    />
  </>
));

export const VideoIcon = createIcon(({ stroke, accent, strokeWidth }) => (
  <>
    <Path
      d="M22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22H15C20 22 22 20 22 15Z"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2.52002 7.11H21.48"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.52002 2.11V6.97"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15.48 2.11V7.05"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9.75 14.4V12.55C9.75 11.25 10.55 10.8 11.65 11.5L13.2 12.42L14.75 13.35C15.85 13.97 15.85 14.83 14.75 15.45L13.2 16.38L11.65 17.3C10.55 17.92 9.75 17.45 9.75 16.15V14.4Z"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
));

export const SubscriptionIcon = createIcon(
  ({ stroke, accent, strokeWidth }) => (
    <>
      <Path
        d="M16.94 6.99C16.94 6.99 16.64 7.28 16.64 7.61C16.64 8.21 17.11 8.68 17.71 8.68C18.31 8.68 18.78 8.21 18.78 7.61C18.78 7.28 18.48 6.99 18.48 6.99"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.92 10.14C21.36 10.53 22 11.56 22 13.24V15.24C22 18.24 21.24 19 18.24 19H5.76C2.76 19 2 18.24 2 15.24V13.24C2 11.56 2.64 10.53 4.08 10.14"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 15.0001C14.2091 15.0001 16 13.2092 16 11.0001C16 8.79101 14.2091 7.00012 12 7.00012C9.79086 7.00012 8 8.79101 8 11.0001C8 13.2092 9.79086 15.0001 12 15.0001Z"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.00977 6.99C5.00977 6.99 5.30977 7.28 5.30977 7.61C5.30977 8.21 4.83977 8.68 4.23977 8.68C3.63977 8.68 3.16977 8.21 3.16977 7.61C3.16977 7.28 3.46977 6.99 3.46977 6.99"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.43945 3.01C9.43945 3.01 9.13945 3.3 9.13945 3.63C9.13945 4.23 9.60945 4.7 10.2095 4.7C10.8095 4.7 11.2795 4.23 11.2795 3.63C11.2795 3.3 10.9795 3.01 10.9795 3.01"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  )
);

export const SettingsIcon = createIcon(({ stroke, accent, strokeWidth }) => (
  <>
    <Path
      d="M22 6.5H16"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6 6.5H2"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 10C11.933 10 13.5 8.433 13.5 6.5C13.5 4.567 11.933 3 10 3C8.067 3 6.5 4.567 6.5 6.5C6.5 8.433 8.067 10 10 10Z"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 17.5H18"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 17.5H2"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 21C15.933 21 17.5 19.433 17.5 17.5C17.5 15.567 15.933 14 14 14C12.067 14 10.5 15.567 10.5 17.5C10.5 19.433 12.067 21 14 21Z"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeMiterlimit="10"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
));

export const LanguageIcon = createIcon(({ stroke, accent, strokeWidth }) => (
  <>
    <Path
      d="M2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12.25 12H2.82"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 21.82C14.94 21.44 17.5 19.3 18.96 16.5H5.04C6.5 19.3 9.06 21.44 12 21.82Z"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 2.18C9.06 2.56 6.5 4.7 5.04 7.5H18.96C17.5 4.7 14.94 2.56 12 2.18Z"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2.5 7.5H21.5"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2.5 16.5H21.5"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12.25 12C12.25 17.52 14.5 22 18 22"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12.25 12C12.25 6.48 14.5 2 18 2"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
));

export const AboutIcon = createIcon(({ stroke, accent, strokeWidth }) => (
  <>
    <Path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 8V13"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11.9941 16H12.0031"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
));

export const HelpIcon = createIcon(({ stroke, accent, strokeWidth }) => (
  <>
    <Path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9.08984 9.00002C9.32984 8.21002 9.93984 7.52002 10.6998 7.19002C11.4598 6.86002 12.2998 6.91002 13.0198 7.32002C13.7398 7.73002 14.2398 8.46002 14.3898 9.29002C14.5398 10.12 14.3198 10.98 13.7998 11.65C13.2798 12.32 12.5198 12.72 11.6998 12.75L11.4698 12.76C10.9198 12.76 10.4698 13.21 10.4698 13.76V14"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11.9941 17H12.0031"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
));

export default StarBarsIcon;
