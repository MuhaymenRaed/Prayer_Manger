import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { LogBox } from "react-native";
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

// Expo Go (SDK 53+) dropped remote-push support and logs a noisy error on
// startup even though we only use LOCAL scheduled notifications (which work
// in a development build). Silence that specific dev-only message.
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "`expo-notifications` functionality is not fully supported in Expo Go",
]);

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
        <Stack.Screen name="auth/reset" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ headerShown: false }} />
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
