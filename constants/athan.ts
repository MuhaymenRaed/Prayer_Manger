/**
 * Athan audio configuration.
 *
 * ── HOW TO ACTIVATE THE ATHAN FEATURE ────────────────────────────────────────
 * 1. Obtain LICENSED Shia athan recordings (verified to include
 *    «أشهد أن علياً ولي الله») for each muezzin you want to offer:
 *      - full athan  → assets/sounds/athan_full_<id>.mp3   (complete athan)
 *      - takbir only → assets/sounds/athan_takbir_<id>.mp3 (تكبيرة الإحرام)
 *    where <id> matches an entry in MUEZZINS below.
 * 2. Register every file in app.json → plugins → expo-notifications →
 *    "sounds": ["./assets/sounds/athan_full_default.mp3", ...]
 * 3. Flip HAS_ATHAN_AUDIO to true and rebuild the app (native change).
 *
 * Until then the athan settings section stays hidden and prayer alerts use
 * the default notification sound — nothing broken ships to users.
 */
export const HAS_ATHAN_AUDIO = false;

export interface Muezzin {
  id: string;
  nameEn: string;
  nameAr: string;
}

/** Add one entry per muezzin whose recordings are bundled. */
export const MUEZZINS: Muezzin[] = [
  { id: "default", nameEn: "Default", nameAr: "الافتراضي" },
];

export type AthanMode = "notification" | "takbir" | "full";

/** Android channel id for a given athan mode + muezzin. */
export function athanChannelId(mode: AthanMode, muezzinId: string): string {
  if (mode === "notification") return "prayers";
  return `athan-${mode}-${muezzinId}`;
}

/** Bundled sound filename for a channel (as registered in app.json). */
export function athanSoundFile(mode: Exclude<AthanMode, "notification">, muezzinId: string): string {
  return `athan_${mode}_${muezzinId}.mp3`;
}
