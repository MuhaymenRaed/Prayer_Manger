import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { I18nManager, LogBox } from "react-native";
import "react-native-reanimated";
import "../global.css";

import { DialogProvider } from "../components/AppDialog";
import { CloudSync } from "../components/CloudSync";
import { NotificationManager } from "../components/NotificationManager";
import { AuthProvider } from "../contexts/AuthContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { SettingsProvider } from "../contexts/SettingsContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { TrackerProvider } from "../contexts/TrackerContext";
import { registerBackgroundRefresh } from "../services/backgroundRefresh";
import { requestNotificationPermissions } from "../services/notificationService";

// Direction is managed entirely in JS from the in-app language choice —
// native RTL mirroring (Arabic device locales) must never double-flip it.
I18nManager.allowRTL(false);
I18nManager.swapLeftAndRightInRTL(false);

// Expo Go (SDK 53+) dropped remote-push support and logs a noisy error on
// startup even though we only use LOCAL scheduled notifications (which work
// in a development build). Silence that specific dev-only message.
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "`expo-notifications` functionality is not fully supported in Expo Go",
]);

const ONBOARDED_KEY = "@yaqeen_onboarded";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutNav() {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
    registerBackgroundRefresh();
  }, []);

  // First-launch onboarding gate (language + theme choice).
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => {
      if (!v) {
        // Defer until after the first render so the router is mounted.
        setTimeout(() => router.replace("/onboarding" as Href), 0);
      }
      setChecked(true);
    });
  }, [router]);

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      {checked && <NotificationManager />}
      <CloudSync />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
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
              <DialogProvider>
                <RootLayoutNav />
              </DialogProvider>
            </AuthProvider>
          </TrackerProvider>
        </SettingsProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
