/**
 * Athan (takbir) alert sounds.
 *
 * 20 bundled recordings live in assets/sounds/sound<n>.mp3 and are
 * registered as native notification sounds in app.json →
 * plugins → expo-notifications → "sounds". Users pick one in Settings
 * (with in-app preview via expo-audio); prayer-time notifications then
 * play it through a per-sound Android channel (iOS uses content.sound).
 *
 * NOTE (Android): notification channels are immutable once created, so
 * each sound gets its own channel id — switching sounds switches channels.
 */
export const HAS_ATHAN_AUDIO = true;

export type AthanMode = "notification" | "takbir";

export interface AthanSoundOption {
  id: string;
  /** Bundled filename as registered with expo-notifications. */
  file: string;
  /** Ordinal shown to the user ("Sound 3" / "الصوت 3"). */
  n: number;
  /** Static asset module for in-app preview playback. */
  module: number;
}

export const ATHAN_SOUNDS: AthanSoundOption[] = [
  { id: "sound1", file: "sound1.mp3", n: 1, module: require("../assets/sounds/sound1.mp3") },
  { id: "sound2", file: "sound2.mp3", n: 2, module: require("../assets/sounds/sound2.mp3") },
  { id: "sound3", file: "sound3.mp3", n: 3, module: require("../assets/sounds/sound3.mp3") },
  { id: "sound4", file: "sound4.mp3", n: 4, module: require("../assets/sounds/sound4.mp3") },
  { id: "sound5", file: "sound5.mp3", n: 5, module: require("../assets/sounds/sound5.mp3") },
  { id: "sound6", file: "sound6.mp3", n: 6, module: require("../assets/sounds/sound6.mp3") },
  { id: "sound7", file: "sound7.mp3", n: 7, module: require("../assets/sounds/sound7.mp3") },
  { id: "sound8", file: "sound8.mp3", n: 8, module: require("../assets/sounds/sound8.mp3") },
  { id: "sound9", file: "sound9.mp3", n: 9, module: require("../assets/sounds/sound9.mp3") },
  { id: "sound10", file: "sound10.mp3", n: 10, module: require("../assets/sounds/sound10.mp3") },
  { id: "sound11", file: "sound11.mp3", n: 11, module: require("../assets/sounds/sound11.mp3") },
  { id: "sound12", file: "sound12.mp3", n: 12, module: require("../assets/sounds/sound12.mp3") },
  { id: "sound13", file: "sound13.mp3", n: 13, module: require("../assets/sounds/sound13.mp3") },
  { id: "sound14", file: "sound14.mp3", n: 14, module: require("../assets/sounds/sound14.mp3") },
  { id: "sound15", file: "sound15.mp3", n: 15, module: require("../assets/sounds/sound15.mp3") },
  { id: "sound16", file: "sound16.mp3", n: 16, module: require("../assets/sounds/sound16.mp3") },
  { id: "sound17", file: "sound17.mp3", n: 17, module: require("../assets/sounds/sound17.mp3") },
  { id: "sound18", file: "sound18.mp3", n: 18, module: require("../assets/sounds/sound18.mp3") },
  { id: "sound19", file: "sound19.mp3", n: 19, module: require("../assets/sounds/sound19.mp3") },
  { id: "sound20", file: "sound20.mp3", n: 20, module: require("../assets/sounds/sound20.mp3") },
];

export const DEFAULT_ATHAN_SOUND = "sound1";

export function getAthanSound(id: string): AthanSoundOption {
  return ATHAN_SOUNDS.find((s) => s.id === id) ?? ATHAN_SOUNDS[0];
}

/**
 * Android channel id for a given mode + sound.
 * "athan2-" (v2): Android channels are immutable, so any channel created by
 * an earlier build without a working sound stays broken forever — bumping
 * the id generation guarantees fresh channels WITH the bundled sound.
 */
export function athanChannelId(mode: AthanMode, soundId: string): string {
  if (mode === "notification") return "prayers";
  return `athan2-${soundId}`;
}
