import { Lang } from "../translations";
import { AppSettings, PrayerProgress, TrackerCounts, TrackerKey } from "../types/prayer";
import { supabase } from "./supabase";

const TRACKER_KEYS: TrackerKey[] = [
  "fajr",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
  "ayat",
];

const ZERO = (): PrayerProgress => ({ missed: 0, completed: 0 });

// ─── Push ────────────────────────────────────────────────────────────────────
export async function pushTracker(
  userId: string,
  counts: TrackerCounts,
): Promise<void> {
  const rows = TRACKER_KEYS.map((key) => ({
    user_id: userId,
    prayer: key,
    count: counts[key].missed,
    completed: counts[key].completed,
  }));
  await supabase.from("qadha_counts").upsert(rows, { onConflict: "user_id,prayer" });
}

export async function pushSettings(
  userId: string,
  settings: AppSettings,
  lang: Lang,
): Promise<void> {
  await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      theme: settings.themeMode ?? (settings.isDarkMode ? "dark" : "light"),
      language: lang,
      prayer_notifications: settings.prayerNotifications,
      sound: settings.sound,
      vibration: settings.vibration,
      motivation: settings.motivation,
      quran_daily: settings.quranDaily,
      location_id: settings.locationId,
      pinned_times: settings.pinnedTimes,
      show_asr_isha: settings.showAsrIsha,
      show_sun_events: settings.showSunEvents,
      athan_mode: settings.athanMode,
      athan_sound_id: settings.athanSoundId,
    },
    { onConflict: "user_id" },
  );
}

// ─── Pull ────────────────────────────────────────────────────────────────────
export interface RemoteState {
  counts: TrackerCounts | null;
  settings: Partial<AppSettings> | null;
  lang: Lang | null;
}

export async function pullAll(userId: string): Promise<RemoteState> {
  const [tracker, settings] = await Promise.all([
    supabase.from("qadha_counts").select("prayer, count, completed").eq("user_id", userId),
    supabase
      .from("user_settings")
      .select(
        "theme, language, prayer_notifications, sound, vibration, motivation, quran_daily, location_id, pinned_times, show_asr_isha, show_sun_events, athan_mode, athan_sound_id",
      )
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  let counts: TrackerCounts | null = null;
  if (tracker.data && tracker.data.length > 0) {
    counts = {
      fajr: ZERO(),
      dhuhr: ZERO(),
      asr: ZERO(),
      maghrib: ZERO(),
      isha: ZERO(),
      ayat: ZERO(),
    };
    for (const row of tracker.data) {
      const key = row.prayer as TrackerKey;
      if (key in counts) {
        const missed = Math.max(0, Number(row.count) || 0);
        const completed = Math.min(missed, Math.max(0, Number(row.completed) || 0));
        counts[key] = { missed, completed };
      }
    }
  }

  let mappedSettings: Partial<AppSettings> | null = null;
  let lang: Lang | null = null;
  if (settings.data) {
    const s = settings.data;
    const themeMode =
      s.theme === "dark" || s.theme === "light" || s.theme === "system"
        ? (s.theme as AppSettings["themeMode"])
        : "dark";
    mappedSettings = {
      themeMode,
      isDarkMode: themeMode === "dark",
      prayerNotifications: s.prayer_notifications,
      sound: s.sound,
      vibration: s.vibration,
      motivation: s.motivation,
      quranDaily: s.quran_daily,
      locationId: s.location_id,
    };
    // Columns added in migration 0003 — tolerate older rows/projects where
    // they don't exist yet (undefined simply leaves the local value intact).
    if (s.pinned_times != null) mappedSettings.pinnedTimes = s.pinned_times;
    if (s.show_asr_isha != null) mappedSettings.showAsrIsha = s.show_asr_isha;
    if (s.show_sun_events != null) mappedSettings.showSunEvents = s.show_sun_events;
    if (s.athan_mode === "takbir" || s.athan_mode === "notification") {
      mappedSettings.athanMode = s.athan_mode;
    }
    if (typeof s.athan_sound_id === "string" && s.athan_sound_id) {
      mappedSettings.athanSoundId = s.athan_sound_id;
    }
    lang = s.language === "ar" ? "ar" : "en";
  }

  return { counts, settings: mappedSettings, lang };
}
