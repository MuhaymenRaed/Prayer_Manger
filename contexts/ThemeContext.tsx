import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Colors } from "../constants/theme";
import { getSettings, saveSettings } from "../services/storageService";

type ThemeColors = typeof Colors.dark;

interface ThemeContextValue {
  isDarkMode: boolean;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    getSettings().then((s) => setIsDarkMode(s.isDarkMode));
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    const current = await getSettings();
    await saveSettings({ ...current, isDarkMode: next });
  }, [isDarkMode]);

  const colors = isDarkMode ? Colors.dark : Colors.light;

  const value = useMemo(
    () => ({ isDarkMode, colors, toggleTheme }),
    [isDarkMode, colors, toggleTheme],
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
