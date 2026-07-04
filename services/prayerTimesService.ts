import {
  CalculationMethod,
  Coordinates,
  Madhab,
  Prayer,
  PrayerTimes,
  Rounding,
} from "adhan";
import { PrayerName, PrayerTimeInfo } from "../types/prayer";

/**
 * Shia Ithna Ashari (Jafari) prayer-time calculation, tuned to match the
 * widely-used Iraqi timetables (haqibat al-mumin / hmomen.com):
 *   - Fajr angle   18°    (dawn — verified against hmomen for Iraqi cities)
 *   - Maghrib angle 4°    (disappearance of the eastern redness, ~17 min
 *                          after sunset — the Shia Maghrib)
 *   - Isha angle   14°
 *   - Asr: standard shadow ratio (1× object height)
 *
 * Also derives Sunset (astronomical) and the shar'i Midnight (the midpoint
 * between sunset and the next dawn) which Shia timetables display.
 */
function baseParams() {
  const params = CalculationMethod.Tehran(); // 17.7 / 14 / maghrib 4.5
  params.madhab = Madhab.Shafi;
  params.fajrAngle = 18;
  params.maghribAngle = 4;
  params.ishaAngle = 14;
  return params;
}

// Rounding convention, verified empirically against hmomen (haqibat
// al-mumin) across multiple Iraqi cities and dates (31/32 exact):
//   - Asr / Sunset / Maghrib / Isha round UP (ihtiyat — the time has
//     certainly entered / the fast has certainly ended).
//   - Fajr / Sunrise / Dhuhr round NEAREST.
function upParams() {
  const params = baseParams();
  params.rounding = Rounding.Up;
  return params;
}

function nearestParams() {
  const params = baseParams();
  params.rounding = Rounding.Nearest;
  return params;
}

export function getShiaPrayerTimes(
  latitude: number,
  longitude: number,
  date: Date = new Date(),
): {
  prayers: PrayerTimeInfo[];
  nextPrayer: PrayerTimeInfo | null;
  timeToNext: string;
} {
  const coordinates = new Coordinates(latitude, longitude);
  const ptUp = new PrayerTimes(coordinates, date, upParams());
  const ptNear = new PrayerTimes(coordinates, date, nearestParams());
  const now = new Date();
  const nextEnum = ptUp.nextPrayer();

  const fajr = ptNear.fajr;
  const sunset = ptUp.sunset;

  // Shar'i midnight = midpoint between sunset and the next day's dawn.
  const tomorrow = new Date(date.getTime() + 86400000);
  const fajrTomorrow = new PrayerTimes(
    coordinates,
    tomorrow,
    nearestParams(),
  ).fajr;
  const midnight = new Date((sunset.getTime() + fajrTomorrow.getTime()) / 2);

  const rows: {
    name: PrayerName;
    arabicName: string;
    time: Date;
    prayerEnum: (typeof Prayer)[keyof typeof Prayer] | null;
    informational: boolean;
  }[] = [
    { name: "Fajr", arabicName: "الفجر", time: fajr, prayerEnum: Prayer.Fajr, informational: false },
    { name: "Sunrise", arabicName: "الشروق", time: ptNear.sunrise, prayerEnum: Prayer.Sunrise, informational: true },
    { name: "Dhuhr", arabicName: "الظهر", time: ptNear.dhuhr, prayerEnum: Prayer.Dhuhr, informational: false },
    { name: "Asr", arabicName: "العصر", time: ptUp.asr, prayerEnum: Prayer.Asr, informational: false },
    { name: "Sunset", arabicName: "الغروب", time: sunset, prayerEnum: null, informational: true },
    { name: "Maghrib", arabicName: "المغرب", time: ptUp.maghrib, prayerEnum: Prayer.Maghrib, informational: false },
    { name: "Isha", arabicName: "العشاء", time: ptUp.isha, prayerEnum: Prayer.Isha, informational: false },
    { name: "Midnight", arabicName: "منتصف الليل", time: midnight, prayerEnum: null, informational: true },
  ];

  const prayers: PrayerTimeInfo[] = rows.map((row) => ({
    name: row.name,
    arabicName: row.arabicName,
    time: row.time,
    isPassed: now > row.time,
    isNext: !row.informational && row.prayerEnum !== null && nextEnum === row.prayerEnum,
    isInformational: row.informational,
  }));

  const nextPrayer = prayers.find((p) => p.isNext) ?? null;

  let timeToNext = "";
  if (nextPrayer) {
    const diffMs = nextPrayer.time.getTime() - now.getTime();
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      timeToNext = `${hours}h ${minutes}m`;
    } else {
      timeToNext = `${minutes} minutes`;
    }
  }

  return { prayers, nextPrayer, timeToNext };
}

export function formatTime(
  date: Date,
  lang: "en" | "ar" = "en",
  timezone?: string,
): string {
  return date.toLocaleTimeString(lang === "ar" ? "ar-u-nu-latn" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  });
}

export function formatDate(
  date: Date,
  lang: "en" | "ar" = "en",
  timezone?: string,
): string {
  return date.toLocaleDateString(lang === "ar" ? "ar" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(timezone ? { timeZone: timezone } : {}),
  });
}
