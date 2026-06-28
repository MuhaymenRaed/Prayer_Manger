import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";

import { CloudSync } from "../components/CloudSync";
import { NotificationManager } from "../components/NotificationManager";
import { AuthProvider } from "../contexts/AuthContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { TrackerProvider } from "../contexts/TrackerContext";
import { requestNotificationPermissions } from "../services/notificationService";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutNav() {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <NotificationManager />
      <CloudSync />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <SettingsProvider>
          <TrackerProvider>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </TrackerProvider>
        </SettingsProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
