import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useDialog } from "./AppDialog";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useTracker } from "../contexts/TrackerContext";
import { TrackerCounts, TrackerKey } from "../types/prayer";

const LUNAR_YEAR_DAYS = 354;
const MONTH_DAYS = 30;
const DAILY_PRAYERS: TrackerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function StepperField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const { colors } = useTheme();

  const bump = (delta: number) => {
    onChange(Math.max(0, value + delta));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View className="flex-1 items-center">
      <Text className="text-xs font-semibold mb-1.5" style={{ color: colors.textSecondary }}>
        {label}
      </Text>
      <View
        className="w-full rounded-2xl border overflow-hidden"
        style={{ borderColor: colors.border, backgroundColor: colors.countBox }}
      >
        <TouchableOpacity
          className="items-center py-1.5"
          onPress={() => bump(1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-up" size={16} color={colors.tint} />
        </TouchableOpacity>
        <TextInput
          className="text-center text-xl font-bold py-1"
          style={{ color: colors.countBoxText }}
          value={String(value)}
          onChangeText={(v) => {
            const parsed = parseInt(v, 10);
            onChange(isNaN(parsed) || parsed < 0 ? 0 : parsed);
          }}
          keyboardType="number-pad"
          maxLength={3}
          selectTextOnFocus
        />
        <TouchableOpacity
          className="items-center py-1.5"
          onPress={() => bump(-1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Small elegant entry card + full calculator modal (أقل المتيقّن method). */
export function QadhaCalculator() {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { counts, replaceAll } = useTracker();
  const dialog = useDialog();

  const [visible, setVisible] = useState(false);
  const [years, setYears] = useState(0);
  const [months, setMonths] = useState(0);
  const [days, setDays] = useState(0);

  const totalDays = years * LUNAR_YEAR_DAYS + months * MONTH_DAYS + days;

  const apply = useCallback(() => {
    dialog.show({
      title: t.tracker.calcApplyTitle,
      message: t.tracker.calcApplyMsg(totalDays),
      icon: "calculator-outline",
      buttons: [
        { text: t.tracker.cancel, style: "cancel" },
        {
          text: t.tracker.calcApply,
          onPress: async () => {
            // Replace the five daily-prayer totals atomically; whatever was
            // already made up stays counted (clamped to the new total).
            const next: TrackerCounts = { ...counts };
            for (const key of DAILY_PRAYERS) {
              next[key] = {
                missed: totalDays,
                completed: Math.min(counts[key].completed, totalDays),
              };
            }
            await replaceAll(next);
            setVisible(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            dialog.show({
              title: t.tracker.calcApplied,
              message: t.tracker.calcAppliedMsg,
              icon: "checkmark-circle-outline",
            });
          },
        },
      ],
    });
  }, [dialog, t, totalDays, counts, replaceAll]);

  return (
    <>
      {/* entry card */}
      <TouchableOpacity
        className="flex-row items-center gap-3 rounded-3xl border px-4 py-3.5 mt-3"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.card,
          flexDirection: isRTL ? "row-reverse" : "row",
        }}
        onPress={() => setVisible(true)}
        activeOpacity={0.85}
      >
        <View
          className="w-10 h-10 rounded-2xl items-center justify-center"
          style={{ backgroundColor: colors.totalBadgeBg }}
        >
          <Ionicons name="calculator-outline" size={20} color={colors.tint} />
        </View>
        <View className="flex-1" style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
          <Text className="text-sm font-bold" style={{ color: colors.text }}>
            {t.tracker.calcTitle}
          </Text>
          <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
            {t.tracker.calcSubtitle}
          </Text>
        </View>
        <View
          className="px-3 py-1.5 rounded-full"
          style={{ backgroundColor: colors.tint }}
        >
          <Text className="text-xs font-bold" style={{ color: colors.addBtnText }}>
            {t.tracker.calcOpen}
          </Text>
        </View>
      </TouchableOpacity>

      {/* calculator modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: colors.overlay }}
          onPress={() => setVisible(false)}
        >
          <Pressable
            className="w-full rounded-3xl p-6"
            style={{ backgroundColor: colors.card, maxHeight: "85%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View
                className="flex-row items-center gap-2 mb-2"
                style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                <Ionicons name="calculator-outline" size={20} color={colors.tint} />
                <Text className="text-lg font-bold" style={{ color: colors.text }}>
                  {t.tracker.calcTitle}
                </Text>
              </View>

              <Text
                className="text-xs leading-5 mb-4"
                style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}
              >
                {t.tracker.calcExplain}
              </Text>

              {/* inputs */}
              <View
                className="flex-row gap-3 mb-4"
                style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                <StepperField label={t.tracker.calcYears} value={years} onChange={setYears} />
                <StepperField label={t.tracker.calcMonths} value={months} onChange={setMonths} />
                <StepperField label={t.tracker.calcDays} value={days} onChange={setDays} />
              </View>

              {/* live total */}
              <View
                className="rounded-2xl px-4 py-3 mb-4"
                style={{ backgroundColor: colors.totalBadgeBg }}
              >
                <Text
                  className="text-sm font-bold text-center"
                  style={{ color: colors.tint }}
                >
                  {t.tracker.calcTotal(totalDays)}
                </Text>
              </View>

              <View
                className="flex-row gap-3"
                style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                <TouchableOpacity
                  className="flex-1 py-3 rounded-2xl items-center border"
                  style={{ borderColor: colors.border }}
                  onPress={() => setVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                    {t.tracker.cancel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-2xl items-center"
                  style={{ backgroundColor: colors.tint, opacity: totalDays > 0 ? 1 : 0.5 }}
                  onPress={apply}
                  disabled={totalDays <= 0}
                  activeOpacity={0.85}
                >
                  <Text className="text-sm font-bold" style={{ color: colors.addBtnText }}>
                    {t.tracker.calcApply}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
