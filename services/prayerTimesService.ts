import {
  CalculationMethod,
  Coordinates,
  Madhab,
  Prayer,
  PrayerTimes,
} from "adhan";
import { PrayerName, PrayerTimeInfo } from "../types/prayer";

/**
 * Shia Ithna Ashari prayer time calculation:
 *    Fajr angle: 17.7°, Isha angle: 14° — standard for Islamic Republic of Iran
 *  - Madhab: Hanafi shadow factor (2x) for Asr, which aligns with many
 *    Jafari scholars who prefer the later Asr time.
 *
 * Note: The Shia Adhan includes the additional phrase
 * "Ash-hadu anna Aliyan wali-ullah" after the Shahada.
 */
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
  const params = CalculationMethod.Tehran();
  // Jafari Asr: shadow ratio equivalent to Hanafi (2× object height)
  params.madhab = Madhab.Hanafi;

  const pt = new PrayerTimes(coordinates, date, params);
  const now = new Date();
  const nextEnum = pt.nextPrayer();

  const rows: Array<{
    name: PrayerName;
    arabicName: string;
    time: Date;
    prayerEnum: (typeof Prayer)[keyof typeof Prayer];
    isSunrise: boolean;
  }> = [
    {
      name: "Fajr",
      arabicName: "الفجر",
      time: pt.fajr,
      prayerEnum: Prayer.Fajr,
      isSunrise: false,
    },
    {
      name: "Sunrise",
      arabicName: "الشروق",
      time: pt.sunrise,
      prayerEnum: Prayer.Sunrise,
      isSunrise: true,
    },
    {
      name: "Dhuhr",
      arabicName: "الظهر",
      time: pt.dhuhr,
      prayerEnum: Prayer.Dhuhr,
      isSunrise: false,
    },
    {
      name: "Asr",
      arabicName: "العصر",
      time: pt.asr,
      prayerEnum: Prayer.Asr,
      isSunrise: false,
    },
    {
      name: "Maghrib",
      arabicName: "المغرب",
      time: pt.maghrib,
      prayerEnum: Prayer.Maghrib,
      isSunrise: false,
    },
    {
      name: "Isha",
      arabicName: "العشاء",
      time: pt.isha,
      prayerEnum: Prayer.Isha,
      isSunrise: false,
    },
  ];

  const prayers: PrayerTimeInfo[] = rows.map((row) => ({
    name: row.name,
    arabicName: row.arabicName,
    time: row.time,
    isPassed: now > row.time,
    isNext: !row.isSunrise && nextEnum === row.prayerEnum,
    isSunrise: row.isSunrise,
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

export function formatTime(date: Date, lang: "en" | "ar" = "en"): string {
  return date.toLocaleTimeString(lang === "ar" ? "ar-u-nu-latn" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDate(date: Date, lang: "en" | "ar" = "en"): string {
  return date.toLocaleDateString(lang === "ar" ? "ar" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
