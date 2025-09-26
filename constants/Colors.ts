import palette from "./palette.json";

const Colors = {
  light: {
    ...palette.light,
    tint: palette.light.primary,
    tabIconDefault: palette.light.textSubtle,
    tabIconSelected: palette.light.primary,
    statusBarStyle: "dark" as const,
  },
  dark: {
    ...palette.dark,
    tint: palette.dark.primary,
    tabIconDefault: palette.dark.textMuted,
    tabIconSelected: palette.dark.primary,
    statusBarStyle: "light" as const,
  },
} as const;

export type ThemeName = keyof typeof Colors;
export type ThemeColor = keyof typeof Colors.light;

export const NavigationColors = {
  light: {
    dark: false,
    colors: {
      primary: Colors.light.tint,
      background: Colors.light.background,
      card: Colors.light.backgroundElevated,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.accent,
    },
  },
  dark: {
    dark: true,
    colors: {
      primary: Colors.dark.tint,
      background: Colors.dark.background,
      card: Colors.dark.backgroundElevated,
      text: Colors.dark.text,
      border: Colors.dark.border,
      notification: Colors.dark.accent,
    },
  },
} as const;

export default Colors;
