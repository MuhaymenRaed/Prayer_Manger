import { LocationOption } from "../types/prayer";

/**
 * Preset locations for prayer-time calculation.
 * Focus: all 18 Iraqi governorates first, then major cities across
 * Shia-majority / significant countries. Coordinates are city centers.
 */
export const LOCATIONS: LocationOption[] = [
  // ── Iraq (governorate capitals) ────────────────────────────────
  { id: "iq-najaf", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Najaf", nameAr: "النجف", latitude: 31.9959, longitude: 44.3148 },
  { id: "iq-karbala", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Karbala", nameAr: "كربلاء", latitude: 32.6160, longitude: 44.0249 },
  { id: "iq-baghdad", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Baghdad", nameAr: "بغداد", latitude: 33.3152, longitude: 44.3661 },
  { id: "iq-basra", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Basra", nameAr: "البصرة", latitude: 30.5085, longitude: 47.7835 },
  { id: "iq-hillah", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Hillah (Babil)", nameAr: "الحلة (بابل)", latitude: 32.4637, longitude: 44.4198 },
  { id: "iq-kut", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Kut (Wasit)", nameAr: "الكوت (واسط)", latitude: 32.5126, longitude: 45.8181 },
  { id: "iq-amarah", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Amarah (Maysan)", nameAr: "العمارة (ميسان)", latitude: 31.8357, longitude: 47.1445 },
  { id: "iq-nasiriyah", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Nasiriyah (Dhi Qar)", nameAr: "الناصرية (ذي قار)", latitude: 31.0539, longitude: 46.2576 },
  { id: "iq-samawah", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Samawah (Muthanna)", nameAr: "السماوة (المثنى)", latitude: 31.3091, longitude: 45.2810 },
  { id: "iq-diwaniyah", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Diwaniyah (Qadisiyyah)", nameAr: "الديوانية (القادسية)", latitude: 31.9928, longitude: 44.9247 },
  { id: "iq-baquba", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Baquba (Diyala)", nameAr: "بعقوبة (ديالى)", latitude: 33.7506, longitude: 44.6447 },
  { id: "iq-samarra", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Samarra (Salah al-Din)", nameAr: "سامراء (صلاح الدين)", latitude: 34.1959, longitude: 43.8742 },
  { id: "iq-kirkuk", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Kirkuk", nameAr: "كركوك", latitude: 35.4681, longitude: 44.3922 },
  { id: "iq-mosul", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Mosul (Nineveh)", nameAr: "الموصل (نينوى)", latitude: 36.3450, longitude: 43.1450 },
  { id: "iq-ramadi", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Ramadi (Anbar)", nameAr: "الرمادي (الأنبار)", latitude: 33.4258, longitude: 43.3089 },
  { id: "iq-erbil", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Erbil", nameAr: "أربيل", latitude: 36.1901, longitude: 44.0091 },
  { id: "iq-sulaymaniyah", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Sulaymaniyah", nameAr: "السليمانية", latitude: 35.5614, longitude: 45.4329 },
  { id: "iq-duhok", country: "iq", countryEn: "Iraq", countryAr: "العراق", nameEn: "Duhok", nameAr: "دهوك", latitude: 36.8669, longitude: 42.9503 },

  // ── Iran ───────────────────────────────────────────────────────
  { id: "ir-tehran", country: "ir", countryEn: "Iran", countryAr: "إيران", nameEn: "Tehran", nameAr: "طهران", latitude: 35.6892, longitude: 51.3890 },
  { id: "ir-qom", country: "ir", countryEn: "Iran", countryAr: "إيران", nameEn: "Qom", nameAr: "قم", latitude: 34.6416, longitude: 50.8746 },
  { id: "ir-mashhad", country: "ir", countryEn: "Iran", countryAr: "إيران", nameEn: "Mashhad", nameAr: "مشهد", latitude: 36.2605, longitude: 59.6168 },
  { id: "ir-isfahan", country: "ir", countryEn: "Iran", countryAr: "إيران", nameEn: "Isfahan", nameAr: "أصفهان", latitude: 32.6539, longitude: 51.6660 },

  // ── Levant / Gulf ──────────────────────────────────────────────
  { id: "lb-beirut", country: "lb", countryEn: "Lebanon", countryAr: "لبنان", nameEn: "Beirut", nameAr: "بيروت", latitude: 33.8938, longitude: 35.5018 },
  { id: "sy-damascus", country: "sy", countryEn: "Syria", countryAr: "سوريا", nameEn: "Sayyidah Zaynab", nameAr: "السيدة زينب", latitude: 33.4441, longitude: 36.3414 },
  { id: "bh-manama", country: "bh", countryEn: "Bahrain", countryAr: "البحرين", nameEn: "Manama", nameAr: "المنامة", latitude: 26.2285, longitude: 50.5860 },
  { id: "kw-kuwait", country: "kw", countryEn: "Kuwait", countryAr: "الكويت", nameEn: "Kuwait City", nameAr: "مدينة الكويت", latitude: 29.3759, longitude: 47.9774 },
  { id: "sa-qatif", country: "sa", countryEn: "Saudi Arabia", countryAr: "السعودية", nameEn: "Qatif", nameAr: "القطيف", latitude: 26.5196, longitude: 49.9962 },
  { id: "sa-makkah", country: "sa", countryEn: "Saudi Arabia", countryAr: "السعودية", nameEn: "Makkah", nameAr: "مكة المكرمة", latitude: 21.4225, longitude: 39.8262 },
  { id: "sa-madinah", country: "sa", countryEn: "Saudi Arabia", countryAr: "السعودية", nameEn: "Madinah", nameAr: "المدينة المنورة", latitude: 24.5247, longitude: 39.5692 },

  // ── Wider Shia communities ─────────────────────────────────────
  { id: "az-baku", country: "az", countryEn: "Azerbaijan", countryAr: "أذربيجان", nameEn: "Baku", nameAr: "باكو", latitude: 40.4093, longitude: 49.8671 },
  { id: "pk-karachi", country: "pk", countryEn: "Pakistan", countryAr: "باكستان", nameEn: "Karachi", nameAr: "كراتشي", latitude: 24.8607, longitude: 67.0011 },
  { id: "pk-lahore", country: "pk", countryEn: "Pakistan", countryAr: "باكستان", nameEn: "Lahore", nameAr: "لاهور", latitude: 31.5204, longitude: 74.3587 },
  { id: "in-lucknow", country: "in", countryEn: "India", countryAr: "الهند", nameEn: "Lucknow", nameAr: "لكناو", latitude: 26.8467, longitude: 80.9462 },
  { id: "af-kabul", country: "af", countryEn: "Afghanistan", countryAr: "أفغانستان", nameEn: "Kabul", nameAr: "كابول", latitude: 34.5553, longitude: 69.2075 },
];

export const DEFAULT_LOCATION_ID = "iq-najaf";

export function getLocationById(id: string): LocationOption | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

/** Group locations by country for a sectioned picker. */
export function groupedLocations(): { country: string; countryEn: string; countryAr: string; items: LocationOption[] }[] {
  const map = new Map<string, { country: string; countryEn: string; countryAr: string; items: LocationOption[] }>();
  for (const loc of LOCATIONS) {
    if (!map.has(loc.country)) {
      map.set(loc.country, { country: loc.country, countryEn: loc.countryEn, countryAr: loc.countryAr, items: [] });
    }
    map.get(loc.country)!.items.push(loc);
  }
  return Array.from(map.values());
}
