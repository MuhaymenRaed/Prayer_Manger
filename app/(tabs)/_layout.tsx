import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";

// Keep the tracker (main) as the landing tab regardless of tab order.
export const unstable_settings = {
  initialRouteName: "index",
};

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  name,
  focused,
  color,
}: {
  name: IoniconsName;
  focused: boolean;
  color: string;
}) {
  return (
    <View
      className="items-center justify-center w-9 h-9 rounded-full"
      style={focused ? { backgroundColor: "rgba(46,204,113,0.15)" } : undefined}
    >
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  // Reserve the device's bottom safe area (gesture bar / nav buttons / notch)
  // on BOTH platforms so the bar never sits under the system navigation.
  const BASE_H = 60;
  const bottomInset = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 0);
  const TAB_H = BASE_H + bottomInset;
  const TAB_PB = bottomInset + 6;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: TAB_H,
          paddingBottom: TAB_PB,
          paddingTop: 8,
          // elevated, clearly separated from system nav
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
          elevation: 14,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      {/*
        Tab order:
          • Arabic (RTL): Tracker → Prayer Times → Settings  (current order)
          • English (LTR): Settings → Prayer Times → Tracker  (reversed)
        The `order` array below is rendered left-to-right; `initialRouteName`
        keeps the tracker as the opening tab either way.
      */}
      {(isRTL
        ? ["index", "prayer-times", "settings"]
        : ["settings", "prayer-times", "index"]
      ).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={
            name === "index"
              ? {
                  title: t.tabs.tracker,
                  tabBarIcon: ({ color, focused }) => (
                    <TabIcon name="timer-outline" focused={focused} color={color} />
                  ),
                }
              : name === "prayer-times"
                ? {
                    title: t.tabs.prayerTimes,
                    tabBarIcon: ({ color, focused }) => (
                      <TabIcon name="calendar-outline" focused={focused} color={color} />
                    ),
                  }
                : {
                    title: t.tabs.settings,
                    tabBarIcon: ({ color, focused }) => (
                      <TabIcon name="settings-outline" focused={focused} color={color} />
                    ),
                  }
          }
        />
      ))}
    </Tabs>
  );
}
