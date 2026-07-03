export type PrayerName =
  | "Fajr"
  | "Sunrise"
  | "Dhuhr"
  | "Asr"
  | "Sunset"
  | "Maghrib"
  | "Isha"
  | "Midnight";

export interface PrayerTimeInfo {
  name: PrayerName;
  arabicName: string;
  time: Date;
  isPassed: boolean;
  isNext: boolean;
  /** Sunrise / Sunset / Midnight — shown for reference, never notified. */
  isInformational: boolean;
}

/**
 * Progress for a single tracked prayer (qadha / missed prayers).
 *  - `missed`    : total number of prayers the user owes (denominator)
 *  - `completed` : how many have been made up so far (numerator)
 * remaining = missed - completed. Progress bar = completed / missed.
 */
export interface PrayerProgress {
  missed: number;
  completed: number;
}

export interface TrackerCounts {
  fajr: PrayerProgress;
  dhuhr: PrayerProgress;
  asr: PrayerProgress;
  maghrib: PrayerProgress;
  isha: PrayerProgress;
  /** Salat al-Ayat (صلاة الآيات) — eclipses, earthquakes, etc. */
  ayat: PrayerProgress;
}

export type TrackerKey = keyof TrackerCounts;

export interface AppSettings {
  isDarkMode: boolean;
  prayerNotifications: boolean;
  sound: boolean;
  vibration: boolean;
  /** Motivational / accountability reminders based on progress. */
  motivation: boolean;
  /** Daily Quran ayah notification. */
  quranDaily: boolean;
  /** Persistent notification pinned with today's prayer times. */
  pinnedTimes: boolean;
  /** id of the manually selected location, or "auto" for GPS. */
  locationId: string;
}

export interface SavedLocation {
  latitude: number;
  longitude: number;
  displayName: string;
}

/** A selectable preset location (governorate / city) for prayer times. */
export interface LocationOption {
  id: string;
  /** ISO-ish country grouping key, e.g. "iq", "ir". */
  country: string;
  countryEn: string;
  countryAr: string;
  nameEn: string;
  nameAr: string;
  latitude: number;
  longitude: number;
  /** IANA timezone, e.g. "Asia/Baghdad" — used to display times correctly. */
  timezone: string;
}
