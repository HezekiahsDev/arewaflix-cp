/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./constants/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: (() => {
        const palette = require("./constants/palette.json");

        const addColorPair = (name, lightKey, darkKey = lightKey) => ({
          [name]: palette.light[lightKey],
          [`${name}-dark`]: palette.dark[darkKey],
        });

        return {
          ...addColorPair("background", "background"),
          ...addColorPair("background-elevated", "backgroundElevated"),
          ...addColorPair("surface", "surface"),
          ...addColorPair("surface-muted", "surfaceMuted"),
          ...addColorPair("card", "card"),
          ...addColorPair("overlay", "overlay"),
          ...addColorPair("border", "border"),
          ...addColorPair("text", "text"),
          ...addColorPair("muted", "textMuted"),
          ...addColorPair("subtle", "textSubtle"),
          ...addColorPair("primary", "primary"),
          ...addColorPair("primary-muted", "primaryMuted"),
          ...addColorPair("primary-foreground", "primaryForeground"),
          ...addColorPair("accent", "accent"),
          ...addColorPair("accent-foreground", "accentForeground"),
          ...addColorPair("success", "success"),
          ...addColorPair("warning", "warning"),
          ...addColorPair("danger", "danger"),
        };
      })(),
    },
  },
  plugins: [],
};
