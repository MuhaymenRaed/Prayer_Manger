import AsyncStorage from "@react-native-async-storage/async-storage";

import { getLocationById } from "../constants/locations";
import { Lang, T } from "../translations";
import { AppSettings } from "../types/prayer";
import {
  cancelAllNotifications,
  dismissPinnedTimes,
  schedulePinnedUpdateAt,
  scheduleUpcomingPrayerAlerts,
  showPinnedTimes,
} from "./notificationService";
import {
  formatTime,
  getNextUpcomingPrayer,
} from "./prayerTimesService";
import { getSavedLocation, getSettings } from "./storageService";

const DEFAULT_LAT = 31.9928;
const DEFAULT_LON = 44.3357;
// Mirrors LanguageContext — this module must also work headlessly (background
// task), where React context is unavailable.
const LANG_KEY = "@prayer_lang";

function deviceLang(): Lang {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? "en";
    return locale.toLowerCase().startsWith("ar") ? "ar" : "en";
  } catch {
    return "en";
  }
}

async function resolveLang(): Promise<Lang> {
  const saved = await AsyncStorage.getItem(LANG_KEY).catch(() => null);
  if (saved === "ar" || saved === "en") return saved;
  return deviceLang();
}

async function resolveCoords(settings: AppSettings): Promise<{
  lat: number;
  lon: number;
  tz?: string;
}> {
  const preset =
    settings.locationId !== "auto"
      ? getLocationById(settings.locationId)
      : undefined;
  if (preset) {
    return { lat: preset.latitude, lon: preset.longitude, tz: preset.timezone };
  }
  const saved = await getSavedLocation();
  return {
    lat: saved?.latitude ?? DEFAULT_LAT,
    lon: saved?.longitude ?? DEFAULT_LON,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/** (Re)schedule the 7-day window of prayer alerts with localized content. */
export async function refreshAlertWindow(): Promise<void> {
  const settings = await getSettings();
  if (!settings.prayerNotifications) {
    await cancelAllNotifications();
    return;
  }
  const lang = await resolveLang();
  const t = T[lang];
  const { lat, lon } = await resolveCoords(settings);

  await scheduleUpcomingPrayerAlerts(
    lat,
    lon,
    (p) => {
      const name = t.athanNames[p.name] ?? p.name;
      return {
        title: t.notif.title(name),
        body: t.notif.body(name, p.arabicName),
      };
    },
    { mode: settings.athanMode, soundId: settings.athanSoundId },
  );
}

/**
 * Present the pinned next-prayer bar AND pre-arm its replacement at the
 * exact moment that prayer arrives — so the bar flips to the following
 * prayer on time even with the app closed. (Order matters: the immediate
 * presentation shares the pending-schedule id, so it must run first.)
 */
export async function armPinnedChain(): Promise<void> {
  const settings = await getSettings();
  if (!settings.prayerNotifications || !settings.pinnedTimes) {
    await dismissPinnedTimes();
    return;
  }
  const lang = await resolveLang();
  const t = T[lang];
  const { lat, lon, tz } = await resolveCoords(settings);

  const now = new Date();
  const current = getNextUpcomingPrayer(lat, lon, settings.showAsrIsha, now);
  if (!current) {
    await dismissPinnedTimes();
    return;
  }

  const line = (target: { name: string; time: Date }, from: Date) => {
    const mins = Math.max(
      0,
      Math.floor((target.time.getTime() - from.getTime()) / 60000),
    );
    return t.notif.pinnedNext(
      t.athanNames[target.name] ?? target.name,
      formatTime(target.time, lang, tz),
      t.prayerTimes.durationShort(Math.floor(mins / 60), mins % 60),
    );
  };

  // 1) Present the bar for the current next prayer.
  await showPinnedTimes(line(current, now));

  // 2) Pre-arm the flip: one minute after that prayer arrives, the bar
  //    replaces itself with the prayer after it (content computed for that
  //    future moment, so its countdown is correct when it appears).
  const flipAt = new Date(current.time.getTime() + 60000);
  const after = getNextUpcomingPrayer(lat, lon, settings.showAsrIsha, flipAt);
  if (after) {
    await schedulePinnedUpdateAt(flipAt, line(after, flipAt));
  }
}

/** Full refresh — used by app startup, settings changes and the bg task. */
export async function refreshAllAlerts(): Promise<void> {
  await refreshAlertWindow();
  await armPinnedChain();
}
