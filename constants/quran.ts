export interface QuranVerse {
  ar: string;
  en: string;
  refAr: string;
  refEn: string;
}

/** A small rotating set of verses related to prayer, patience and hope. */
export const QURAN_VERSES: QuranVerse[] = [
  {
    ar: "إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا",
    en: "Indeed, prayer has been decreed upon the believers a decree of specified times.",
    refAr: "النساء ١٠٣",
    refEn: "An-Nisa 4:103",
  },
  {
    ar: "وَأَقِمِ الصَّلَاةَ لِذِكْرِي",
    en: "And establish prayer for My remembrance.",
    refAr: "طه ١٤",
    refEn: "Ta-Ha 20:14",
  },
  {
    ar: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ",
    en: "And seek help through patience and prayer.",
    refAr: "البقرة ٤٥",
    refEn: "Al-Baqarah 2:45",
  },
  {
    ar: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    en: "Indeed, with hardship comes ease.",
    refAr: "الشرح ٦",
    refEn: "Ash-Sharh 94:6",
  },
  {
    ar: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    en: "Indeed, Allah is with the patient.",
    refAr: "البقرة ١٥٣",
    refEn: "Al-Baqarah 2:153",
  },
  {
    ar: "وَلَا تَيْأَسُوا مِنْ رَوْحِ اللَّهِ",
    en: "And do not despair of the mercy of Allah.",
    refAr: "يوسف ٨٧",
    refEn: "Yusuf 12:87",
  },
  {
    ar: "قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ",
    en: "Say, 'O My servants who have transgressed against themselves, do not despair of the mercy of Allah.'",
    refAr: "الزمر ٥٣",
    refEn: "Az-Zumar 39:53",
  },
  {
    ar: "فَاذْكُرُونِي أَذْكُرْكُمْ",
    en: "So remember Me; I will remember you.",
    refAr: "البقرة ١٥٢",
    refEn: "Al-Baqarah 2:152",
  },
  {
    ar: "إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ",
    en: "Indeed, Allah loves those who turn to Him in repentance.",
    refAr: "البقرة ٢٢٢",
    refEn: "Al-Baqarah 2:222",
  },
  {
    ar: "وَبَشِّرِ الصَّابِرِينَ",
    en: "And give good tidings to the patient.",
    refAr: "البقرة ١٥٥",
    refEn: "Al-Baqarah 2:155",
  },
];

/** Deterministic verse-of-the-day based on the date. */
export function verseOfTheDay(date: Date = new Date()): QuranVerse {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  return QURAN_VERSES[dayOfYear % QURAN_VERSES.length];
}
