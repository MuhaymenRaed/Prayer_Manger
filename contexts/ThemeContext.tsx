import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { Colors } from "../constants/theme";
import { getSettings, saveSettings } from "../services/storageService";
import { ThemeMode } from "../types/prayer";

type ThemeColors = typeof Colors.dark;

interface ThemeContextValue {
  isDarkMode: boolean;
  themeMode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    getSettings().then((s) => setMode(s.themeMode ?? (s.isDarkMode ? "dark" : "light")));
  }, []);

  const isDarkMode =
    themeMode === "system" ? systemScheme === "dark" : themeMode === "dark";

  const persistMode = useCallback(async (mode: ThemeMode) => {
    setMode(mode);
    const current = await getSettings();
    await saveSettings({
      ...current,
      themeMode: mode,
      isDarkMode: mode === "system" ? current.isDarkMode : mode === "dark",
    });
  }, []);

  const toggleTheme = useCallback(async () => {
    await persistMode(isDarkMode ? "light" : "dark");
  }, [isDarkMode, persistMode]);

  const colors = isDarkMode ? Colors.dark : Colors.light;

  const value = useMemo(
    () => ({ isDarkMode, themeMode, colors, toggleTheme, setThemeMode: persistMode }),
    [isDarkMode, themeMode, colors, toggleTheme, persistMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
