// Force the app to use dark mode everywhere by returning 'dark'.
// This overrides the native `useColorScheme` so components relying on the hook
// always receive 'dark'.
import { ThemeName } from "@/constants/Colors";

export function useColorScheme(): ThemeName {
  return "dark";
}
