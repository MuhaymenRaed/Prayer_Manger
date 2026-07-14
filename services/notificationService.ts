import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  AthanMode,
  athanChannelId,
  athanSoundFile,
  HAS_ATHAN_AUDIO,
  MUEZZINS,
} from "../constants/athan";
import { QuranVerse } from "../constants/quran";
import { PrayerTimeInfo } from "../types/prayer";

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

export async function requestNotificationPermissions(): Promise<boolean> {
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

    // Athan channels — only once licensed recordings are bundled
    // (see constants/athan.ts for the activation steps).
    if (HAS_ATHAN_AUDIO) {
      for (const muezzin of MUEZZINS) {
        for (const mode of ["takbir", "full"] as const) {
          await Notifications.setNotificationChannelAsync(
            athanChannelId(mode, muezzin.id),
            {
              name: `Athan (${mode}) — ${muezzin.nameEn}`,
              importance: Notifications.AndroidImportance.HIGH,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: "#2ECC71",
              sound: athanSoundFile(mode, muezzin.id),
            },
          );
        }
      }
    }
  }

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
  athan?: { mode: AthanMode; muezzinId: string },
): Promise<void> {
  // Cancel only previous prayer alerts, preserving motivation/quran ones.
  await cancelByKind("prayer");

  const now = new Date();

  // Route to an athan channel only when real audio is bundled.
  const channelId =
    HAS_ATHAN_AUDIO && athan && athan.mode !== "notification"
      ? athanChannelId(athan.mode, athan.muezzinId)
      : "prayers";

  for (const prayer of prayers) {
    if (prayer.isInformational || prayer.isPassed) continue;
    if (prayer.time.getTime() <= now.getTime()) continue;

    const { title, body } = buildContent(prayer);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
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
