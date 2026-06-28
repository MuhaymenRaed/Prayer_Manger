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

import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { remaining, useTracker } from "../../contexts/TrackerContext";
import { TrackerKey } from "../../types/prayer";

type FeedbackType = "good" | "bad" | null;

// ─── Animated progress bar ───────────────────────────────────────────────────
function ProgressBar({
  pct,
  color,
  track,
}: {
  pct: number;
  color: string;
  track: string;
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
      className="h-2.5 rounded-full overflow-hidden w-full"
      style={{ backgroundColor: track }}
    >
      <Animated.View
        style={{ width, height: "100%", backgroundColor: color, borderRadius: 999 }}
      />
    </View>
  );
}

// ─── Prayer / Salat-al-Ayat card ─────────────────────────────────────────────
function PrayerCard({
  prayerKey,
  label,
  arabic,
  accent,
  bg,
  icon,
  description,
  onEditTotal,
}: {
  prayerKey: TrackerKey;
  label: string;
  arabic: string;
  accent?: string;
  bg?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  description?: string;
  onEditTotal: (key: TrackerKey) => void;
}) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { counts, markCompleted, addMissed, resetOne } = useTracker();

  const progress = counts[prayerKey];
  const left = remaining(progress);
  const pct = progress.missed > 0 ? progress.completed / progress.missed : 0;
  const isDone = progress.missed > 0 && left === 0;
  const isEmpty = progress.missed === 0;

  const accentColor = accent ?? colors.tint;

  // animations: flash overlay, shake (regret), pop (motivation)
  const flash = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const [feedback, setFeedback] = useState<{ type: FeedbackType; text: string }>(
    { type: null, text: "" },
  );

  const runFeedback = useCallback(
    (type: Exclude<FeedbackType, null>, text: string) => {
      setFeedback({ type, text });
      flash.setValue(1);
      Animated.timing(flash, {
        toValue: 0,
        duration: 1600,
        useNativeDriver: false,
      }).start(() => setFeedback({ type: null, text: "" }));

      if (type === "good") {
        Animated.sequence([
          Animated.spring(pop, { toValue: 1.04, useNativeDriver: true, speed: 50 }),
          Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 20 }),
        ]).start();
      } else {
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
      }
    },
    [flash, pop, shake],
  );

  const handlePrayed = useCallback(async () => {
    if (left <= 0) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newLeft = await markCompleted(prayerKey);
    runFeedback("good", t.tracker.motivateMsg(newLeft));
  }, [left, markCompleted, prayerKey, runFeedback, t]);

  const handleMissed = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await addMissed(prayerKey, 1);
    runFeedback("bad", t.tracker.regretMsg);
  }, [addMissed, prayerKey, runFeedback, t]);

  const handleReset = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await resetOne(prayerKey);
  }, [prayerKey, resetOne]);

  const flashColor = feedback.type === "good" ? colors.success : colors.danger;
  const translateX = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-6, 6],
  });

  return (
    <Animated.View
      className="rounded-3xl mb-3.5 border overflow-hidden"
      style={{
        backgroundColor: bg ?? colors.card,
        borderColor: isDone ? colors.success : colors.border,
        borderWidth: isDone ? 1.5 : 1,
        transform: [{ scale: pop }, { translateX }],
        shadowColor: colors.cardShadow,
        shadowOpacity: 1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      {/* feedback flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: flashColor,
          opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
        }}
      />

      <View className="p-5">
        {/* header row */}
        <View
          className="flex-row items-center justify-between mb-3"
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        >
          <View
            className="flex-row items-center gap-2.5"
            style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: accentColor + "22" }}
            >
              <Ionicons name={icon ?? "moon"} size={18} color={accentColor} />
            </View>
            <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
              <Text className="text-base font-bold" style={{ color: colors.text }}>
                {label}
              </Text>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                {description ?? arabic}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onEditTotal(prayerKey)}
            className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full"
            style={{ backgroundColor: colors.countBox }}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={13} color={colors.textSecondary} />
            <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              {isEmpty ? t.tracker.setTotal : t.tracker.editTotal}
            </Text>
          </TouchableOpacity>
        </View>

        {isEmpty ? (
          // empty state — prompt to set a total
          <TouchableOpacity
            onPress={() => onEditTotal(prayerKey)}
            className="items-center py-5 rounded-2xl border border-dashed"
            style={{ borderColor: colors.border }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={26} color={accentColor} />
            <Text className="text-sm mt-1.5" style={{ color: colors.textSecondary }}>
              {t.tracker.setTotal}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* big numbers */}
            <View
              className="flex-row items-end justify-between mb-2.5"
              style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
            >
              <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
                <Text
                  className="text-4xl font-extrabold"
                  style={{ color: isDone ? colors.success : colors.text }}
                >
                  {isDone ? "✓" : left}
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  {isDone ? t.tracker.progressDone : t.tracker.remaining}
                </Text>
              </View>
              <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                {progress.completed} {t.tracker.of} {progress.missed} {t.tracker.madeUp}
              </Text>
            </View>

            {/* progress bar */}
            <ProgressBar
              pct={pct}
              color={isDone ? colors.success : accentColor}
              track={colors.progressTrack}
            />

            {/* feedback line */}
            {feedback.type && (
              <Animated.Text
                className="text-xs font-semibold mt-2.5"
                style={{
                  color: feedback.type === "good" ? colors.successText : colors.dangerText,
                  textAlign: isRTL ? "right" : "left",
                  opacity: flash,
                }}
              >
                {feedback.type === "good" ? "🌿 " : "💧 "}
                {feedback.text}
              </Animated.Text>
            )}

            {/* actions */}
            <View
              className="flex-row items-center gap-2.5 mt-4"
              style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
            >
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1.5 py-3 rounded-2xl"
                style={{ backgroundColor: isDone ? colors.countBox : accentColor, opacity: isDone ? 0.6 : 1 }}
                onPress={handlePrayed}
                disabled={isDone}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={isDone ? colors.textMuted : colors.addBtnText}
                />
                <Text
                  className="text-sm font-bold"
                  style={{ color: isDone ? colors.textMuted : colors.addBtnText }}
                >
                  {t.tracker.prayedOne}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border"
                style={{ borderColor: colors.danger, backgroundColor: colors.dangerBg }}
                onPress={handleMissed}
                activeOpacity={0.85}
              >
                <Ionicons name="sad-outline" size={17} color={colors.dangerText} />
                <Text className="text-sm font-semibold" style={{ color: colors.dangerText }}>
                  {t.tracker.missedDay}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="w-11 h-11 rounded-2xl items-center justify-center border"
                style={{ borderColor: colors.border, backgroundColor: colors.countBox }}
                onPress={handleReset}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={17} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Set-total modal ─────────────────────────────────────────────────────────
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

          <TextInput
            className="h-14 rounded-2xl text-center text-2xl font-bold border mb-5"
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
            autoFocus
          />

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
const PRAYER_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  fajr: "partly-sunny-outline",
  dhuhr: "sunny-outline",
  asr: "cloudy-outline",
  maghrib: "moon-outline",
  isha: "star-outline",
};

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

  return (
    <SafeAreaView className="flex-1" edges={["top", "left", "right"]} style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View className="items-center py-4 gap-1">
          <Ionicons name="timer-outline" size={26} color={colors.headerTitle} />
          <Text
            className="text-2xl font-bold tracking-wide mt-1"
            style={{ color: colors.headerTitle, textAlign: "center" }}
          >
            {t.tracker.title}
          </Text>
          <Text className="text-xs" style={{ color: colors.textSecondary, textAlign: "center" }}>
            {t.tracker.subtitle}
          </Text>
        </View>

        {/* overall summary card */}
        <View
          className="rounded-3xl p-5 mb-5 border"
          style={{
            backgroundColor: totalRemaining === 0 ? colors.successBg : colors.totalBadgeBg,
            borderColor: totalRemaining === 0 ? colors.success : colors.border,
          }}
        >
          {totalRemaining === 0 && grandTotal > 0 ? (
            <View className="items-center gap-1">
              <Text className="text-base font-bold" style={{ color: colors.successText }}>
                {t.tracker.allClear}
              </Text>
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                {t.tracker.allClearSub}
              </Text>
            </View>
          ) : (
            <>
              <View
                className="flex-row items-center justify-between mb-2.5"
                style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                <Text className="text-sm font-medium" style={{ color: colors.text }}>
                  {t.tracker.total}
                </Text>
                <Text className="text-2xl font-extrabold" style={{ color: colors.tint }}>
                  {totalRemaining}
                </Text>
              </View>
              <ProgressBar pct={overallPct} color={colors.tint} track={colors.progressTrack} />
              {grandTotal > 0 && (
                <Text
                  className="text-xs mt-2"
                  style={{ color: colors.textSecondary, textAlign: isRTL ? "right" : "left" }}
                >
                  {totalCompleted} {t.tracker.of} {grandTotal} {t.tracker.madeUp}
                </Text>
              )}
            </>
          )}
        </View>

        {/* daily prayers */}
        {t.trackerPrayers.map((p) => (
          <PrayerCard
            key={p.key}
            prayerKey={p.key}
            label={p.label}
            arabic={p.arabic}
            icon={PRAYER_ICONS[p.key]}
            onEditTotal={setEditingKey}
          />
        ))}

        {/* Salat al-Ayat */}
        <Text
          className="text-xs font-bold uppercase tracking-wider mt-3 mb-2.5 px-1"
          style={{ color: colors.textMuted, textAlign: isRTL ? "right" : "left" }}
        >
          {t.tracker.ayatSection}
        </Text>
        <PrayerCard
          prayerKey="ayat"
          label={t.tracker.ayatTitle}
          arabic={t.tracker.ayatArabic}
          description={t.tracker.ayatDesc}
          icon="planet-outline"
          accent={colors.ayatAccent}
          bg={colors.ayatBg}
          onEditTotal={setEditingKey}
        />
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
