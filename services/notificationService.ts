import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  AthanMode,
  ATHAN_SOUNDS,
  athanChannelId,
  getAthanSound,
  HAS_ATHAN_AUDIO,
} from "../constants/athan";
import { QuranVerse } from "../constants/quran";
import { PrayerTimeInfo } from "../types/prayer";
import { getShiaPrayerTimes } from "./prayerTimesService";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Kind = "prayer" | "motivation" | "quran" | "pinned";

const PINNED_ID = "pinned-daily-times";

/**
 * Create/refresh every Android channel. Idempotent — safe to call before
 * each scheduling pass so alerts can never be scheduled onto a channel
 * that does not exist yet (channels are upserts; per-sound ids stay stable).
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("prayers", {
      name: "Prayer Times",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2ECC71",
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders & Motivation",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#2ECC71",
    });
    await Notifications.setNotificationChannelAsync("quran", {
      name: "Daily Quran",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#2ECC71",
    });
    await Notifications.setNotificationChannelAsync("pinned", {
      name: "Pinned Prayer Times",
      importance: Notifications.AndroidImportance.LOW, // silent, no heads-up
      sound: undefined,
    });

    // One channel per bundled takbir sound (Android channels are immutable
    // after creation, so each sound needs its own channel id).
    if (HAS_ATHAN_AUDIO) {
      for (const sound of ATHAN_SOUNDS) {
        await Notifications.setNotificationChannelAsync(
          athanChannelId("takbir", sound.id),
          {
            name: `Prayer Athan ${sound.n}`,
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#2ECC71",
            sound: sound.file,
          },
        );
      }
    }
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  await ensureNotificationChannels();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Cancel only notifications previously scheduled with a given `kind`. */
async function cancelByKind(kind: Kind): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => (n.content.data as { kind?: Kind } | null)?.kind === kind)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export interface PrayerNotifContent {
  title: string;
  body: string;
}

export async function schedulePrayerNotifications(
  prayers: PrayerTimeInfo[],
  withVibration: boolean,
  buildContent: (prayer: PrayerTimeInfo) => PrayerNotifContent,
  athan?: { mode: AthanMode; soundId: string },
): Promise<void> {
  // Channels must exist before anything is scheduled onto them.
  await ensureNotificationChannels();

  // Cancel only previous prayer alerts, preserving motivation/quran ones.
  await cancelByKind("prayer");

  const now = new Date();

  const useAthan = HAS_ATHAN_AUDIO && athan?.mode === "takbir";
  // Android: sound comes from the per-sound channel. iOS: per-notification.
  const channelId = useAthan
    ? athanChannelId("takbir", athan!.soundId)
    : "prayers";
  const iosSound: string | boolean =
    useAthan && Platform.OS === "ios" ? getAthanSound(athan!.soundId).file : true;

  for (const prayer of prayers) {
    if (prayer.isInformational || prayer.isPassed) continue;
    if (prayer.time.getTime() <= now.getTime()) continue;

    const { title, body } = buildContent(prayer);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: iosSound,
        data: { kind: "prayer" as Kind, prayer: prayer.name },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: prayer.time,
        channelId,
      },
    });
  }
}

/**
 * Schedule prayer alerts for the next `days` days in one pass (~35 entries,
 * safely under iOS's 64-notification cap). Delivery is OS-level: alerts fire
 * with the selected takbir sound even if the app stays closed for days, and
 * survive reboots via expo-notifications' BOOT_COMPLETED restore. Each app
 * open slides the window forward.
 */
export async function scheduleUpcomingPrayerAlerts(
  latitude: number,
  longitude: number,
  buildContent: (prayer: PrayerTimeInfo) => PrayerNotifContent,
  athan?: { mode: AthanMode; soundId: string },
  days = 7,
): Promise<void> {
  const all: PrayerTimeInfo[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() + i * 86400000);
    all.push(...getShiaPrayerTimes(latitude, longitude, date).prayers);
  }
  await schedulePrayerNotifications(all, false, buildContent, athan);
}

/**
 * Show/refresh the persistent "today's times" notification (like the
 * haqibat al-mumin pinned bar). Minimal by design: no title, one line of
 * times — the app icon does the talking. Re-posting with the same
 * identifier replaces the previous one in place. Android-sticky, silent.
 */
export async function showPinnedTimes(body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: PINNED_ID,
    content: {
      title: null,
      body,
      sound: false,
      sticky: true,
      data: { kind: "pinned" as Kind },
    },
    trigger: { channelId: "pinned" }, // presents immediately on this channel
  });
}

export async function dismissPinnedTimes(): Promise<void> {
  await Notifications.dismissNotificationAsync(PINNED_ID);
}

/**
 * Schedule a daily accountability/motivation reminder based on how many
 * make-up prayers remain. Motivates when close, gently nudges (regret) when
 * the backlog is large.
 */
export async function scheduleMotivationNotification(
  totalRemaining: number,
  messages: {
    motivateTitle: string;
    motivateBody: (left: number) => string;
    regressTitle: string;
    regressBody: (left: number) => string;
  },
  hour = 20,
): Promise<void> {
  await cancelByKind("motivation");
  if (totalRemaining <= 0) return; // nothing owed — no nagging

  // ≤ 10 remaining → encouraging; otherwise a gentle reminder of the backlog.
  const encouraging = totalRemaining <= 10;
  const title = encouraging ? messages.motivateTitle : messages.regressTitle;
  const body = encouraging
    ? messages.motivateBody(totalRemaining)
    : messages.regressBody(totalRemaining);

  await Notifications.scheduleNotificationAsync({
    // Fixed identifier: rescheduling (e.g. after a language switch) replaces
    // the previous one instead of stacking a duplicate in the old language.
    identifier: "daily-motivation",
    content: { title, body, sound: false, data: { kind: "motivation" as Kind } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId: "reminders",
    },
  });
}

/** Schedule a daily verse-of-the-day notification. */
export async function scheduleQuranNotification(
  verse: QuranVerse,
  lang: "en" | "ar",
  format: { quranTitle: string; quranBody: (verse: string, ref: string) => string },
  hour = 9,
): Promise<void> {
  await cancelByKind("quran");

  const text = lang === "ar" ? verse.ar : verse.en;
  const ref = lang === "ar" ? verse.refAr : verse.refEn;

  await Notifications.scheduleNotificationAsync({
    // Fixed identifier — prevents EN + AR duplicates after language changes.
    identifier: "daily-quran",
    content: {
      title: format.quranTitle,
      body: format.quranBody(text, ref),
      sound: false,
      data: { kind: "quran" as Kind },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId: "quran",
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  // The pinned bar is presented (not scheduled), so dismiss it explicitly.
  await Notifications.dismissNotificationAsync(PINNED_ID).catch(() => {});
}

export async function cancelMotivationNotifications(): Promise<void> {
  await cancelByKind("motivation");
}

export async function cancelQuranNotifications(): Promise<void> {
  await cancelByKind("quran");
}
