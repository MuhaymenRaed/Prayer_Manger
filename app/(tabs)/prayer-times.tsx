import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MosqueSilhouette } from "../../components/MosqueSilhouette";
import {
  DEFAULT_LOCATION_ID,
  getLocationById,
  nearestLocation,
} from "../../constants/locations";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  cancelAllNotifications,
  dismissPinnedTimes,
  schedulePrayerNotifications,
  showPinnedTimes,
} from "../../services/notificationService";
import {
  formatDate,
  formatTime,
  getShiaPrayerTimes,
} from "../../services/prayerTimesService";
import { getSavedLocation, saveLocation } from "../../services/storageService";
import {
  LocationOption,
  PrayerName,
  PrayerTimeInfo,
} from "../../types/prayer";

const DEFAULT_LAT = 31.9928;
const DEFAULT_LON = 44.3357;
const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const PRAYER_ICON: Record<PrayerName, React.ComponentProps<typeof Ionicons>["name"]> = {
  Fajr: "cloudy-night-outline",
  Sunrise: "partly-sunny-outline",
  Dhuhr: "sunny",
  Asr: "sunny-outline",
  Sunset: "partly-sunny",
  Maghrib: "cloudy-night",
  Isha: "moon",
  Midnight: "sparkles-outline",
};

function localizedName(loc: LocationOption, lang: "en" | "ar") {
  return lang === "ar"
    ? `${loc.nameAr}، ${loc.countryAr}`
    : `${loc.nameEn}, ${loc.countryEn}`;
}

function resolvePreset(id: string): LocationOption | null {
  if (!id || id === "auto") return null;
  return getLocationById(id) ?? null;
}

// ─── Prayer Row ──────────────────────────────────────────────────────────────
const PrayerRow = React.memo(function PrayerRow({
  prayer,
  isLast,
  timezone,
}: {
  prayer: PrayerTimeInfo;
  isLast: boolean;
  timezone: string;
}) {
  const { colors } = useTheme();
  const { t, isRTL, lang } = useLanguage();

  const active = prayer.isNext;
  const info = prayer.isInformational;
  const secondary = lang === "ar" ? prayer.name : prayer.arabicName;

  return (
    <View
      className="flex-row items-center px-3.5"
      style={[
        {
          flexDirection: isRTL ? "row-reverse" : "row",
          paddingVertical: info ? 10 : 14,
        },
        active && { backgroundColor: colors.nextCardBg },
        !isLast && { borderBottomWidth: 0.5, borderBottomColor: colors.separator },
      ]}
    >
      <View
        className="rounded-full items-center justify-center"
        style={{
          width: info ? 32 : 40,
          height: info ? 32 : 40,
          backgroundColor: active ? colors.tint : info ? "transparent" : colors.countBox,
        }}
      >
        <Ionicons
          name={PRAYER_ICON[prayer.name]}
          size={info ? 16 : 19}
          color={active ? colors.addBtnText : info ? colors.textMuted : colors.textSecondary}
        />
      </View>

      <View className="flex-1 mx-3" style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
        <View
          className="flex-row items-center gap-2"
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        >
          <Text
            style={{
              fontSize: info ? 14 : 15,
              fontWeight: info ? "500" : "700",
              color: active ? colors.tint : info ? colors.textSecondary : colors.text,
            }}
          >
            {t.athanNames[prayer.name] ?? prayer.name}
          </Text>
          {active && (
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.badgeNext }}>
              <Text className="text-[10px] font-bold" style={{ color: colors.badgeNextText }}>
                {t.prayerTimes.next}
              </Text>
            </View>
          )}
          {!info && prayer.isPassed && !active && (
            <Ionicons name="checkmark-circle" size={14} color={colors.textMuted} />
          )}
        </View>
        {!info && (
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {secondary}
          </Text>
        )}
      </View>

      <Text
        style={{
          fontSize: info ? 13 : 15,
          fontWeight: info ? "500" : "700",
          color: active ? colors.tint : info ? colors.textMuted : colors.textSecondary,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatTime(prayer.time, lang, timezone)}
      </Text>
    </View>
  );
});

// ─── Skeleton (shown only while resolving GPS) ───────────────────────────────
function PrayerListSkeleton() {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      className="rounded-3xl overflow-hidden border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <Animated.View
          key={i}
          className="flex-row items-center px-3.5 py-3.5"
          style={{
            opacity: pulse,
            borderBottomWidth: i < 7 ? 0.5 : 0,
            borderBottomColor: colors.separator,
          }}
        >
          <View className="w-10 h-10 rounded-full" style={{ backgroundColor: colors.countBox }} />
          <View className="flex-1 mx-3 gap-1.5">
            <View className="h-3.5 rounded-full" style={{ width: "45%", backgroundColor: colors.countBox }} />
            <View className="h-2.5 rounded-full" style={{ width: "25%", backgroundColor: colors.countBox }} />
          </View>
          <View className="h-3.5 w-16 rounded-full" style={{ backgroundColor: colors.countBox }} />
        </Animated.View>
      ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PrayerTimesScreen() {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { t, isRTL, lang } = useLanguage();

  const startLoc = useMemo(
    () => resolvePreset(settings.locationId) ?? getLocationById(DEFAULT_LOCATION_ID)!,
    // only for the very first paint
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [result, setResult] = useState(() =>
    getShiaPrayerTimes(startLoc.latitude, startLoc.longitude),
  );
  const [locationName, setLocationName] = useState(() => localizedName(startLoc, lang));
  const [timezone, setTimezone] = useState(startLoc.timezone);
  const [resolving, setResolving] = useState(false);
  const [today, setToday] = useState(new Date());
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const coordsRef = useRef({ lat: startLoc.latitude, lon: startLoc.longitude });

  const scheduleNotifs = useCallback(
    (prayers: PrayerTimeInfo[], tz: string) => {
      if (!settings.prayerNotifications) {
        cancelAllNotifications().catch(() => {});
        return;
      }

      // Per-prayer alerts, fully in the app's language (e.g. "صلاة المغرب").
      schedulePrayerNotifications(
        prayers,
        settings.vibration,
        (p) => {
          const localized = t.athanNames[p.name] ?? p.name;
          return {
            title: t.notif.title(localized),
            body: t.notif.body(localized, p.arabicName),
          };
        },
        { mode: settings.athanMode, soundId: settings.athanSoundId },
      ).catch(() => {});

      updatePinned(prayers, tz);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      settings.prayerNotifications,
      settings.vibration,
      settings.pinnedTimes,
      settings.athanMode,
      settings.athanSoundId,
      lang,
      t,
    ],
  );

  // Pinned bar — elegant single line: only the NEXT prayer + remaining time.
  const updatePinned = useCallback(
    (prayers: PrayerTimeInfo[], tz: string) => {
      if (!settings.prayerNotifications || !settings.pinnedTimes) {
        dismissPinnedTimes().catch(() => {});
        return;
      }
      const next = prayers.find((p) => p.isNext);
      if (!next) {
        dismissPinnedTimes().catch(() => {});
        return;
      }
      const mins = Math.max(
        0,
        Math.floor((next.time.getTime() - Date.now()) / 60000),
      );
      const remaining = t.prayerTimes.durationShort(
        Math.floor(mins / 60),
        mins % 60,
      );
      const line = t.notif.pinnedNext(
        t.athanNames[next.name] ?? next.name,
        formatTime(next.time, lang, tz),
        remaining,
      );
      showPinnedTimes(line).catch(() => {});
    },
    [settings.prayerNotifications, settings.pinnedTimes, lang, t],
  );

  const apply = useCallback(
    (lat: number, lon: number, name: string, tz: string) => {
      coordsRef.current = { lat, lon };
      setTimezone(tz);
      setLocationName(name);
      const r = getShiaPrayerTimes(lat, lon);
      setResult(r);
      scheduleNotifs(r.prayers, tz);
    },
    [scheduleNotifs],
  );

  // Resolve location whenever the chosen city / language changes.
  useEffect(() => {
    let cancelled = false;
    const preset = resolvePreset(settings.locationId);

    if (preset) {
      // Instant — no perceived loading for a chosen city.
      apply(preset.latitude, preset.longitude, localizedName(preset, lang), preset.timezone);
      saveLocation({
        latitude: preset.latitude,
        longitude: preset.longitude,
        displayName: localizedName(preset, lang),
      }).catch(() => {});
      setResolving(false);
      return;
    }

    // Automatic (GPS) — the only path that actually needs to wait.
    setResolving(true);
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat = DEFAULT_LAT;
        let lon = DEFAULT_LON;
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        } else {
          const saved = await getSavedLocation();
          lat = saved?.latitude ?? DEFAULT_LAT;
          lon = saved?.longitude ?? DEFAULT_LON;
        }

        const near = nearestLocation(lat, lon);
        let name: string;
        let tz: string;
        if (near) {
          name = localizedName(near, lang);
          tz = near.timezone;
        } else {
          const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          const place = geo[0];
          name = [place?.city, place?.country].filter(Boolean).join(", ") || t.prayerTimes.location;
          tz = DEVICE_TZ;
        }
        if (cancelled) return;
        await saveLocation({ latitude: lat, longitude: lon, displayName: name });
        apply(lat, lon, name, tz);
      } catch {
        if (!cancelled) {
          const saved = await getSavedLocation();
          const lat = saved?.latitude ?? DEFAULT_LAT;
          const lon = saved?.longitude ?? DEFAULT_LON;
          const near = nearestLocation(lat, lon);
          apply(lat, lon, near ? localizedName(near, lang) : saved?.displayName ?? t.prayerTimes.najaf, near?.timezone ?? DEVICE_TZ);
        }
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [settings.locationId, lang, reloadKey, apply, t]);

  // Minute tick: refresh countdown / passed flags + the pinned bar countdown.
  const tzRef = useRef(timezone);
  tzRef.current = timezone;
  useEffect(() => {
    const id = setInterval(() => {
      setToday(new Date());
      const { lat, lon } = coordsRef.current;
      const r = getShiaPrayerTimes(lat, lon);
      setResult(r);
      updatePinned(r.prayers, tzRef.current);
    }, 60000);
    return () => clearInterval(id);
  }, [updatePinned]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setToday(new Date());
    setReloadKey((k) => k + 1);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const { prayers, nextPrayer } = result;

  // Rows visibility per user settings (display-only; alerts stay complete).
  const visiblePrayers = prayers.filter((p) => {
    if (!settings.showAsrIsha && (p.name === "Asr" || p.name === "Isha"))
      return false;
    if (
      !settings.showSunEvents &&
      (p.name === "Sunrise" || p.name === "Sunset" || p.name === "Midnight")
    )
      return false;
    return true;
  });

  // Localized remaining time for the hero (recomputes on each minute tick).
  const minsToNext = nextPrayer
    ? Math.max(0, Math.floor((nextPrayer.time.getTime() - today.getTime()) / 60000))
    : 0;
  const timeToNext = t.prayerTimes.durationShort(
    Math.floor(minsToNext / 60),
    minsToNext % 60,
  );

  return (
    <SafeAreaView className="flex-1" edges={["top", "left", "right"]} style={{ backgroundColor: colors.background }}>
      <ScrollView
        overScrollMode="never"
        bounces={false}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} colors={[colors.tint]} />
        }
      >
        {/* Header */}
        <View className="items-center pt-4 pb-3 gap-0.5">
          <Text className="text-2xl font-bold tracking-wide" style={{ color: colors.headerTitle, textAlign: "center" }}>
            {t.prayerTimes.title}
          </Text>
          <View
            className="flex-row items-center gap-1 mt-1"
            style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
          >
            <Ionicons name="location" size={13} color={colors.tint} />
            <Text className="text-xs font-medium" style={{ color: colors.textSecondary, textAlign: "center" }}>
              {locationName}
            </Text>
          </View>
        </View>

        {/* Next-prayer hero with mosque silhouette */}
        {nextPrayer && (
          <View className="rounded-3xl mb-4 overflow-hidden" style={{ backgroundColor: colors.tint }}>
            <View className="p-5 pb-8">
              <View
                className="flex-row items-center justify-between"
                style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                <View style={{ alignItems: isRTL ? "flex-end" : "flex-start" }}>
                  <Text className="text-xs font-medium" style={{ color: colors.addBtnText, opacity: 0.9 }}>
                    {t.prayerTimes.nextPrayer}
                  </Text>
                  <Text className="text-3xl font-extrabold mt-1" style={{ color: colors.addBtnText }}>
                    {t.athanNames[nextPrayer.name] ?? nextPrayer.name}
                  </Text>
                  <Text className="text-sm font-semibold mt-0.5" style={{ color: colors.addBtnText, opacity: 0.95 }}>
                    {formatTime(nextPrayer.time, lang, timezone)}
                  </Text>
                </View>
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                >
                  <Ionicons name={PRAYER_ICON[nextPrayer.name]} size={30} color={colors.addBtnText} />
                </View>
              </View>
              <View
                className="flex-row items-center gap-1.5 mt-3 self-start px-3 py-1.5 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.18)", flexDirection: isRTL ? "row-reverse" : "row" }}
              >
                <Ionicons name="hourglass-outline" size={13} color={colors.addBtnText} />
                <Text className="text-xs font-bold" style={{ color: colors.addBtnText }}>
                  {t.prayerTimes.in} {timeToNext}
                </Text>
              </View>
            </View>
            {/* decorative mosque skyline */}
            <View className="absolute left-0 right-0 bottom-0" pointerEvents="none">
              <MosqueSilhouette color="#FFFFFF" opacity={0.15} height={64} />
            </View>
          </View>
        )}

        {/* Date strip */}
        <View
          className="flex-row items-center justify-center gap-1.5 mb-3"
          style={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        >
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {formatDate(today, lang, timezone)}
          </Text>
        </View>

        {/* Prayer list (or skeleton while GPS resolves) */}
        {resolving ? (
          <PrayerListSkeleton />
        ) : (
          <View
            className="rounded-3xl overflow-hidden border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            {visiblePrayers.map((prayer, idx) => (
              <PrayerRow
                key={prayer.name}
                prayer={prayer}
                isLast={idx === visiblePrayers.length - 1}
                timezone={timezone}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
