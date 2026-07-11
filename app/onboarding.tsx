import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { YaqeenLogoBox } from "../components/YaqeenLogo";
import { LangPref, useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { ThemeMode } from "../types/prayer";

export const ONBOARDED_KEY = "@yaqeen_onboarded";

function Choice({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      className="flex-row items-center gap-3 px-5 py-4 rounded-2xl border-2 mb-3"
      style={{
        borderColor: selected ? colors.tint : colors.border,
        backgroundColor: selected ? colors.totalBadgeBg : colors.card,
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={22}
        color={selected ? colors.tint : colors.textSecondary}
      />
      <Text
        className="flex-1 text-base font-semibold"
        style={{ color: selected ? colors.tint : colors.text }}
      >
        {label}
      </Text>
      {selected && (
        <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
      )}
    </TouchableOpacity>
  );
}

export default function OnboardingScreen() {
  const { colors, setThemeMode } = useTheme();
  const { t, setLanguage } = useLanguage();
  const router = useRouter();

  const [step, setStep] = useState<0 | 1>(0);
  const [langChoice, setLangChoice] = useState<LangPref>("system");
  const [themeChoice, setThemeChoice] = useState<ThemeMode>("system");

  const o = t.onboarding;

  const handleNext = useCallback(async () => {
    if (step === 0) {
      await setLanguage(langChoice);
      setStep(1);
      return;
    }
    await setThemeMode(themeChoice);
    await AsyncStorage.setItem(ONBOARDED_KEY, "1");
    router.replace("/(tabs)");
  }, [step, langChoice, themeChoice, setLanguage, setThemeMode, router]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <View className="flex-1 px-7 justify-center">
        {/* brand */}
        <View className="items-center mb-9">
          <YaqeenLogoBox size={84} />
          <Text className="text-2xl font-bold mt-4" style={{ color: colors.text }}>
            {o.welcome}
          </Text>
          <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
            {o.welcomeSub}
          </Text>
        </View>

        <Text
          className="text-base font-bold mb-4 text-center"
          style={{ color: colors.text }}
        >
          {step === 0 ? o.chooseLanguage : o.chooseTheme}
        </Text>

        {step === 0 ? (
          <>
            <Choice
              label={o.english}
              icon="language-outline"
              selected={langChoice === "en"}
              onPress={() => setLangChoice("en")}
            />
            <Choice
              label={o.arabic}
              icon="language"
              selected={langChoice === "ar"}
              onPress={() => setLangChoice("ar")}
            />
            <Choice
              label={o.deviceDefault}
              icon="phone-portrait-outline"
              selected={langChoice === "system"}
              onPress={() => setLangChoice("system")}
            />
          </>
        ) : (
          <>
            <Choice
              label={o.light}
              icon="sunny-outline"
              selected={themeChoice === "light"}
              onPress={() => setThemeChoice("light")}
            />
            <Choice
              label={o.dark}
              icon="moon-outline"
              selected={themeChoice === "dark"}
              onPress={() => setThemeChoice("dark")}
            />
            <Choice
              label={o.systemTheme}
              icon="phone-portrait-outline"
              selected={themeChoice === "system"}
              onPress={() => setThemeChoice("system")}
            />
          </>
        )}

        <TouchableOpacity
          className="py-4 rounded-2xl items-center mt-6"
          style={{ backgroundColor: colors.tint }}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text className="text-base font-bold" style={{ color: colors.addBtnText }}>
            {step === 0 ? o.continue : o.start}
          </Text>
        </TouchableOpacity>

        {/* step dots */}
        <View className="flex-row justify-center gap-2 mt-6">
          {[0, 1].map((i) => (
            <View
              key={i}
              className="h-2 rounded-full"
              style={{
                width: step === i ? 20 : 8,
                backgroundColor: step === i ? colors.tint : colors.border,
              }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
