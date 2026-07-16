import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_LOCATION_ID } from "../constants/locations";
import {
  AppSettings,
  PrayerProgress,
  SavedLocation,
  TrackerCounts,
  TrackerKey,
} from "../types/prayer";

const KEYS = {
  TRACKER: "@prayer_tracker",
  SETTINGS: "@prayer_settings",
  LOCATION: "@prayer_location",
} as const;

const ZERO = (): PrayerProgress => ({ missed: 0, completed: 0 });

const DEFAULT_TRACKER: TrackerCounts = {
  fajr: ZERO(),
  dhuhr: ZERO(),
  asr: ZERO(),
  maghrib: ZERO(),
  isha: ZERO(),
  ayat: ZERO(),
};

const TRACKER_KEYS: TrackerKey[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "ayat",
];

export const DEFAULT_SETTINGS: AppSettings = {
  isDarkMode: true,
  themeMode: "dark",
  prayerNotifications: true,
  sound: true,
  vibration: false,
  motivation: true,
  quranDaily: true,
  pinnedTimes: true,
  showAsrIsha: true,
  showSunEvents: true,
  // Takbir plays with the prayer notification by default (sound 1);
  // users can switch back to the plain notification tone in Settings.
  athanMode: "takbir",
  athanSoundId: "sound1",
  locationId: DEFAULT_LOCATION_ID,
};

/** Coerce any stored value (old number format or new object) into PrayerProgress. */
function normalizeProgress(value: unknown): PrayerProgress {
  if (typeof value === "number") {
    // Legacy format: a single missed count.
    return { missed: Math.max(0, Math.floor(value)), completed: 0 };
  }
  if (value && typeof value === "object") {
    const v = value as Partial<PrayerProgress>;
    const missed = Math.max(0, Math.floor(Number(v.missed) || 0));
    const completed = Math.min(
      missed,
      Math.max(0, Math.floor(Number(v.completed) || 0)),
    );
    return { missed, completed };
  }
  return ZERO();
}

export async function getTrackerCounts(): Promise<TrackerCounts> {
  try {
    const data = await AsyncStorage.getItem(KEYS.TRACKER);
    if (!data) return structuredCloneTracker(DEFAULT_TRACKER);
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const result = {} as TrackerCounts;
    for (const key of TRACKER_KEYS) {
      result[key] = normalizeProgress(parsed[key]);
    }
    return result;
  } catch {
    return structuredCloneTracker(DEFAULT_TRACKER);
  }
}

export async function saveTrackerCounts(counts: TrackerCounts): Promise<void> {
  await AsyncStorage.setItem(KEYS.TRACKER, JSON.stringify(counts));
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!data) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function getSavedLocation(): Promise<SavedLocation | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.LOCATION);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveLocation(location: SavedLocation): Promise<void> {
  await AsyncStorage.setItem(KEYS.LOCATION, JSON.stringify(location));
}

function structuredCloneTracker(t: TrackerCounts): TrackerCounts {
  return {
    fajr: { ...t.fajr },
    dhuhr: { ...t.dhuhr },
    asr: { ...t.asr },
    maghrib: { ...t.maghrib },
    isha: { ...t.isha },
    ayat: { ...t.ayat },
  };
}
