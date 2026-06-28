import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getLocationById } from "../../constants/locations";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  cancelAllNotifications,
  schedulePrayerNotifications,
} from "../../services/notificationService";
import {
  formatDate,
  formatTime,
  getShiaPrayerTimes,
} from "../../services/prayerTimesService";
import { getSavedLocation, saveLocation } from "../../services/storageService";
import { PrayerTimeInfo, SavedLocation } from "../../types/prayer";

const DEFAULT_LAT = 31.9928;
const DEFAULT_LON = 44.3357;

// ─── Prayer Row ──────────────────────────────────────────────────────────────
function PrayerRow({
  prayer,
  isLast,
}: {
  prayer: PrayerTimeInfo;
  isLast: boolean;
}) {
  const { colors } = useTheme();
  const { t, isRTL, lang } = useLanguage();

  return (
    <View
      className="flex-row items-center justify-between px-4 py-4"
      style={[
        { backgroundColor: prayer.isNext ? colors.nextCardBg : colors.card },
        prayer.isNext && {
          borderLeftWidth: isRTL ? 0 : 3,
          borderRightWidth: isRTL ? 3 : 0,
          borderLeftColor: colors.nextCardBorder,
          borderRightColor: colors.nextCardBorder,
        },
        !isLast && {
          borderBottomWidth: 0.5,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View className="flex-1" style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
        <View
          className="flex-row items-center gap-2 mb-0.5"
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        >
          <Ionicons
            name={prayer.isSunrise ? "sunny-outline" : "ellipse"}
            size={prayer.isSunrise ? 14 : 8}
            color={prayer.isNext ? colors.tint : colors.textMuted}
          />
          <Text
            className="text-base font-semibold"
            style={{ color: prayer.isNext ? colors.tint : colors.text }}
          >
            {t.prayerNames[prayer.name] ?? prayer.name}
          </Text>

          {prayer.isPassed && !prayer.isNext && (
            <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: colors.badgePassed }}>
              <Text className="text-xs font-medium" style={{ color: colors.badgePassedText }}>
                {t.prayerTimes.passed}
              </Text>
            </View>
          )}
          {prayer.isNext && (
            <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: colors.badgeNext }}>
              <Text className="text-xs font-semibold" style={{ color: colors.badgeNextText }}>
                {t.prayerTimes.next}
              </Text>
            </View>
          )}
        </View>

        {!isRTL && (
          <Text className="text-sm ml-4" style={{ color: colors.textSecondary }}>
            {prayer.arabicName}
          </Text>
        )}
      </View>

      <View
        className="flex-row items-center gap-1.5"
        style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
      >
        <Ionicons
          name="time-outline"
          size={14}
          color={prayer.isNext ? colors.tint : colors.textMuted}
        />
        <Text
          className="text-sm font-semibold"
          style={{ color: prayer.isNext ? colors.tint : colors.textSecondary }}
        >
          {formatTime(prayer.time, lang)}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PrayerTimesScreen() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { t, isRTL, lang } = useLanguage();

  const [prayers, setPrayers] = useState<PrayerTimeInfo[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerTimeInfo | null>(null);
  const [timeToNext, setTimeToNext] = useState("");
  const [locationName, setLocationName] = useState<string>(t.prayerTimes.location);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [today, setToday] = useState(new Date());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coordsRef = useRef({ lat: DEFAULT_LAT, lon: DEFAULT_LON });

  const recalculate = useCallback(
    (lat: number, lon: number, now: Date = new Date(), schedule = true) => {
      coordsRef.current = { lat, lon };
      const result = getShiaPrayerTimes(lat, lon, now);
      setPrayers(result.prayers);
      setNextPrayer(result.nextPrayer);
      setTimeToNext(result.timeToNext);
      // Notifications only need (re)scheduling when times actually change —
      // on load/refresh — not on every minute-tick UI update.
      if (!schedule) return;
      if (settings.prayerNotifications) {
        schedulePrayerNotifications(
          result.prayers,
          settings.vibration,
          t.notif.title,
          t.notif.body,
        ).catch(() => {});
      } else {
        cancelAllNotifications().catch(() => {});
      }
    },
    [settings.prayerNotifications, settings.vibration, t],
  );

  const loadTimes = useCallback(async () => {
    // Manual city selection — use the preset coordinates.
    if (settings.locationId && settings.locationId !== "auto") {
      const preset = getLocationById(settings.locationId);
      if (preset) {
        const name = lang === "ar" ? `${preset.nameAr}، ${preset.countryAr}` : `${preset.nameEn}, ${preset.countryEn}`;
        setLocationName(name);
        await saveLocation({ latitude: preset.latitude, longitude: preset.longitude, displayName: name });
        recalculate(preset.latitude, preset.longitude);
        return;
      }
    }

    // Automatic (GPS).
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        const saved = await getSavedLocation();
        setLocationName(saved?.displayName ?? t.prayerTimes.najaf);
        recalculate(saved?.latitude ?? DEFAULT_LAT, saved?.longitude ?? DEFAULT_LON);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = geocode[0];
      const name =
        [place?.city, place?.region, place?.country].filter(Boolean).join(", ") ||
        t.prayerTimes.location;
      const loc: SavedLocation = { latitude, longitude, displayName: name };
      await saveLocation(loc);
      setLocationName(name);
      recalculate(latitude, longitude);
    } catch {
      const saved = await getSavedLocation();
      setLocationName(saved?.displayName ?? t.prayerTimes.najaf);
      recalculate(saved?.latitude ?? DEFAULT_LAT, saved?.longitude ?? DEFAULT_LON);
    }
  }, [settings.locationId, lang, recalculate, t]);

  useEffect(() => {
    setLoading(true);
    loadTimes().finally(() => setLoading(false));

    tickRef.current = setInterval(() => {
      setToday(new Date());
      const { lat, lon } = coordsRef.current;
      // UI-only refresh of countdown / passed flags; skip notification work.
      recalculate(lat, lon, new Date(), false);
    }, 60000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [loadTimes, recalculate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setToday(new Date());
    await loadTimes();
    setRefreshing(false);
  }, [loadTimes]);

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center gap-3"
        edges={["top", "left", "right"]}
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator size="large" color={colors.tint} />
        <Text className="text-sm" style={{ color: colors.textSecondary }}>
          {t.prayerTimes.calculating}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top", "left", "right"]}
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
      >
        {/* Header */}
        <View className="items-center py-4 gap-1">
          <Text
            className="text-2xl font-bold tracking-wide"
            style={{ color: colors.headerTitle, textAlign: "center" }}
          >
            {t.prayerTimes.title}
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: colors.text, textAlign: "center" }}>
            {formatDate(today, lang)}
          </Text>
          <View
            className="flex-row items-center gap-1 mt-1"
            style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
            <Text className="text-xs" style={{ color: colors.textSecondary, textAlign: "center" }}>
              {locationName}
            </Text>
          </View>
        </View>

        {/* Next-prayer hero countdown */}
        {nextPrayer && (
          <View
            className="rounded-3xl p-5 mb-4 items-center"
            style={{ backgroundColor: colors.tint }}
          >
            <Text className="text-xs font-medium opacity-90" style={{ color: colors.addBtnText }}>
              {t.prayerTimes.nextPrayer}
            </Text>
            <Text className="text-3xl font-extrabold mt-1" style={{ color: colors.addBtnText }}>
              {t.prayerNames[nextPrayer.name] ?? nextPrayer.name}
            </Text>
            <Text className="text-base font-semibold mt-0.5" style={{ color: colors.addBtnText }}>
              {formatTime(nextPrayer.time, lang)}
            </Text>
            <View
              className="flex-row items-center gap-1.5 mt-2 px-3 py-1 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.2)", flexDirection: isRTL ? "row-reverse" : "row" }}
            >
              <Ionicons name="hourglass-outline" size={13} color={colors.addBtnText} />
              <Text className="text-xs font-semibold" style={{ color: colors.addBtnText }}>
                {t.prayerTimes.in} {timeToNext}
              </Text>
            </View>
          </View>
        )}

        {/* Prayer list card */}
        <View
          className="rounded-2xl overflow-hidden border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          {prayers.map((prayer, idx) => (
            <PrayerRow key={prayer.name} prayer={prayer} isLast={idx === prayers.length - 1} />
          ))}
        </View>

        <Text
          className="text-center text-xs mt-3"
          style={{ color: colors.textMuted }}
        >
          {t.prayerTimes.method}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
