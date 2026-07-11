import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDialog } from "../../components/AppDialog";
import { YaqeenLogoBox } from "../../components/YaqeenLogo";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { remaining, useTracker } from "../../contexts/TrackerContext";
import { TrackerKey } from "../../types/prayer";

// ─── Animated progress bar ───────────────────────────────────────────────────
function ProgressBar({
  pct,
  color,
  track,
  height = 8,
}: {
  pct: number;
  color: string;
  track: string;
  height?: number;
}) {
  const anim = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 450,
      useNativeDriver: false,
    }).start();
  }, [pct, anim]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View
      className="rounded-full overflow-hidden w-full"
      style={{ backgroundColor: track, height }}
    >
      <Animated.View
        style={{ width, height: "100%", backgroundColor: color, borderRadius: 999 }}
      />
    </View>
  );
}

// ─── Square prayer card ──────────────────────────────────────────────────────
const PRAYER_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  fajr: "partly-sunny-outline",
  dhuhr: "sunny-outline",
  asr: "cloudy-outline",
  maghrib: "moon-outline",
  isha: "star-outline",
  ayat: "planet-outline",
};

function PrayerCard({
  prayerKey,
  label,
  onEditTotal,
}: {
  prayerKey: TrackerKey;
  label: string;
  onEditTotal: (key: TrackerKey) => void;
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { counts, markCompleted, addMissed, resetOne } = useTracker();
  const dialog = useDialog();

  const isAyat = prayerKey === "ayat";
  const accent = isAyat ? colors.ayatAccent : colors.tint;
  const cardBg = isAyat ? colors.ayatBg : colors.card;

  const progress = counts[prayerKey];
  const left = remaining(progress);
  const pct = progress.missed > 0 ? progress.completed / progress.missed : 0;
  const isDone = progress.missed > 0 && left === 0;
  const isEmpty = progress.missed === 0;

  const flash = useRef(new Animated.Value(0)).current;
  const [flashColor, setFlashColor] = useState(colors.success);

  const runFlash = useCallback(
    (color: string) => {
      setFlashColor(color);
      flash.setValue(1);
      Animated.timing(flash, {
        toValue: 0,
        duration: 900,
        useNativeDriver: false,
      }).start();
    },
    [flash],
  );

  const handlePrayed = useCallback(async () => {
    if (left <= 0) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markCompleted(prayerKey);
    runFlash(colors.success);
  }, [left, markCompleted, prayerKey, runFlash, colors.success]);

  const handleMissed = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await addMissed(prayerKey, 1);
    runFlash(colors.danger);
  }, [addMissed, prayerKey, runFlash, colors.danger]);

  const handleReset = useCallback(() => {
    dialog.show({
      title: t.tracker.resetTitle,
      message: t.tracker.resetMsg(label),
      icon: "refresh-circle-outline",
      buttons: [
        { text: t.tracker.cancel, style: "cancel" },
        {
          text: t.tracker.reset,
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            resetOne(prayerKey);
          },
        },
      ],
    });
  }, [dialog, t, label, prayerKey, resetOne]);

  return (
    <View
      className="rounded-3xl border overflow-hidden"
      style={{
        width: "48.2%",
        backgroundColor: cardBg,
        borderColor: isDone ? colors.success : isAyat ? colors.ayatAccent + "55" : colors.border,
        borderWidth: isDone ? 1.5 : 1,
        shadowColor: colors.cardShadow,
        shadowOpacity: 1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      {/* linked accent line across the family of cards */}
      <View style={{ height: 3, backgroundColor: accent, opacity: isAyat ? 1 : 0.75 }} />

      {/* feedback flash */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: flashColor,
          opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.14] }),
        }}
      />

      <View className="p-3.5">
        {/* header */}
        <View
          className="flex-row items-center justify-between mb-2"
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        >
          <View
            className="flex-row items-center gap-2"
            style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: accent + "22" }}
            >
              <Ionicons name={PRAYER_ICONS[prayerKey]} size={15} color={accent} />
            </View>
            <Text className="text-sm font-bold" style={{ color: colors.text }}>
              {label}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onEditTotal(prayerKey)} hitSlop={8}>
            <Ionicons name="create-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {isEmpty ? (
          <TouchableOpacity
            onPress={() => onEditTotal(prayerKey)}
            className="items-center justify-center py-6 rounded-2xl border border-dashed"
            style={{ borderColor: isAyat ? colors.ayatAccent + "66" : colors.border }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={24} color={accent} />
            <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
              {t.tracker.setTotal}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* numbers */}
            <View className="items-center mb-2">
              <Text
                className="text-3xl font-extrabold"
                style={{ color: isDone ? colors.success : colors.text }}
              >
                {isDone ? "✓" : left}
              </Text>
              <Text className="text-[10px]" style={{ color: colors.textMuted }}>
                {isDone
                  ? t.tracker.progressDone
                  : `${progress.completed} ${t.tracker.of} ${progress.missed} ${t.tracker.madeUp}`}
              </Text>
            </View>

            <ProgressBar
              pct={pct}
              color={isDone ? colors.success : accent}
              track={colors.progressTrack}
              height={6}
            />

            {/* actions */}
            <View
              className="flex-row items-center justify-between mt-3 gap-1.5"
              style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
            >
              <TouchableOpacity
                className="w-9 h-9 rounded-xl items-center justify-center border"
                style={{ borderColor: colors.danger + "88", backgroundColor: colors.dangerBg }}
                onPress={handleMissed}
                activeOpacity={0.8}
              >
                <Ionicons name="sad-outline" size={16} color={colors.dangerText} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 h-9 rounded-xl items-center justify-center flex-row gap-1"
                style={{
                  backgroundColor: isDone ? colors.countBox : accent,
                  opacity: isDone ? 0.55 : 1,
                }}
                onPress={handlePrayed}
                disabled={isDone}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="checkmark"
                  size={17}
                  color={isDone ? colors.textMuted : colors.addBtnText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                className="w-9 h-9 rounded-xl items-center justify-center border"
                style={{ borderColor: colors.border, backgroundColor: colors.countBox }}
                onPress={handleReset}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Set-total modal with steppers ───────────────────────────────────────────
function SetTotalModal({
  visibleKey,
  label,
  initial,
  onClose,
  onSave,
}: {
  visibleKey: TrackerKey | null;
  label: string;
  initial: number;
  onClose: () => void;
  onSave: (value: number) => void;
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const [val, setVal] = useState(String(initial));

  useEffect(() => {
    setVal(String(initial));
  }, [initial, visibleKey]);

  const bump = useCallback(
    (delta: number) => {
      const parsed = parseInt(val, 10);
      const next = Math.max(0, (isNaN(parsed) ? 0 : parsed) + delta);
      setVal(String(next));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [val],
  );

  const save = () => {
    const parsed = parseInt(val, 10);
    onSave(isNaN(parsed) || parsed < 0 ? 0 : parsed);
  };

  return (
    <Modal
      visible={visibleKey !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: colors.overlay }}
        onPress={onClose}
      >
        <Pressable
          className="w-full rounded-3xl p-6"
          style={{ backgroundColor: colors.card }}
          onPress={(e) => e.stopPropagation()}
        >
          <Text
            className="text-lg font-bold mb-1"
            style={{ color: colors.text, textAlign: isRTL ? "right" : "left" }}
          >
            {t.tracker.setTotalTitle(label)}
          </Text>
          <Text
            className="text-xs mb-4"
            style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}
          >
            {t.tracker.setTotalMsg}
          </Text>

          {/* stepper input */}
          <View className="flex-row items-center gap-3 mb-5">
            <TouchableOpacity
              className="w-12 h-14 rounded-2xl items-center justify-center border"
              style={{ backgroundColor: colors.countBox, borderColor: colors.border }}
              onPress={() => bump(-1)}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={22} color={colors.text} />
            </TouchableOpacity>

            <TextInput
              className="flex-1 h-14 rounded-2xl text-center text-2xl font-bold border"
              style={{
                backgroundColor: colors.countBox,
                borderColor: colors.border,
                color: colors.countBoxText,
              }}
              value={val}
              onChangeText={setVal}
              keyboardType="number-pad"
              maxLength={5}
              selectTextOnFocus
            />

            <TouchableOpacity
              className="w-12 h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: colors.tint }}
              onPress={() => bump(1)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color={colors.addBtnText} />
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3" style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
            <TouchableOpacity
              className="flex-1 py-3 rounded-2xl items-center border"
              style={{ borderColor: colors.border }}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                {t.tracker.cancel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-2xl items-center"
              style={{ backgroundColor: colors.tint }}
              onPress={save}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-bold" style={{ color: colors.addBtnText }}>
                {t.tracker.save}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function TrackerScreen() {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { counts, totalRemaining, totalCompleted, setMissed } = useTracker();

  const [editingKey, setEditingKey] = useState<TrackerKey | null>(null);

  const grandTotal = totalRemaining + totalCompleted;
  const overallPct = grandTotal > 0 ? totalCompleted / grandTotal : 0;

  const labelFor = useCallback(
    (key: TrackerKey) => {
      if (key === "ayat") return t.tracker.ayatTitle;
      return t.trackerPrayers.find((p) => p.key === key)?.label ?? key;
    },
    [t],
  );

  const gridKeys: TrackerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha", "ayat"];

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top", "left", "right"]}
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {/* header: logo (start) · title (center) · progress square (end) */}
        <View
          className="flex-row items-center mb-5"
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        >
          <YaqeenLogoBox size={52} />

          <View className="flex-1 items-center px-2">
            <Text
              className="text-xl font-bold tracking-wide"
              style={{ color: colors.headerTitle, textAlign: "center" }}
            >
              {t.tracker.title}
            </Text>
            <Text
              className="text-[10px] mt-0.5"
              style={{ color: colors.textSecondary, textAlign: "center" }}
            >
              {t.tracker.subtitle}
            </Text>
          </View>

          {/* overall progress square */}
          <View
            className="rounded-2xl border items-center justify-center px-2"
            style={{
              width: 64,
              height: 64,
              backgroundColor: totalRemaining === 0 && grandTotal > 0 ? colors.successBg : colors.card,
              borderColor: totalRemaining === 0 && grandTotal > 0 ? colors.success : colors.border,
            }}
          >
            {totalRemaining === 0 && grandTotal > 0 ? (
              <Ionicons name="checkmark-done" size={26} color={colors.success} />
            ) : (
              <>
                <Text
                  className="text-lg font-extrabold"
                  style={{ color: colors.tint }}
                  numberOfLines={1}
                >
                  {totalRemaining}
                </Text>
                <View className="w-full mt-1">
                  <ProgressBar
                    pct={overallPct}
                    color={colors.tint}
                    track={colors.progressTrack}
                    height={4}
                  />
                </View>
                <Text className="text-[8px] mt-0.5" style={{ color: colors.textMuted }}>
                  {t.tracker.total}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* 2-column square grid */}
        <View
          className="flex-row flex-wrap"
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            justifyContent: "space-between",
            rowGap: 12,
          }}
        >
          {gridKeys.map((key) => (
            <PrayerCard
              key={key}
              prayerKey={key}
              label={labelFor(key)}
              onEditTotal={setEditingKey}
            />
          ))}
        </View>
      </ScrollView>

      <SetTotalModal
        visibleKey={editingKey}
        label={editingKey ? labelFor(editingKey) : ""}
        initial={editingKey ? counts[editingKey].missed : 0}
        onClose={() => setEditingKey(null)}
        onSave={(value) => {
          if (editingKey) setMissed(editingKey, value);
          setEditingKey(null);
        }}
      />
    </SafeAreaView>
  );
}
