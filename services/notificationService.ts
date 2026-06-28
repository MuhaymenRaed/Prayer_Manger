import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
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

type Kind = "prayer" | "motivation" | "quran";

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

export async function schedulePrayerNotifications(
  prayers: PrayerTimeInfo[],
  withVibration: boolean,
  notifTitle?: (name: string) => string,
  notifBody?: (name: string, arabic: string) => string,
): Promise<void> {
  // Cancel only previous prayer alerts, preserving motivation/quran ones.
  await cancelByKind("prayer");

  const now = new Date();

  for (const prayer of prayers) {
    if (prayer.isSunrise || prayer.isPassed) continue;
    if (prayer.time.getTime() <= now.getTime()) continue;

    const title = notifTitle
      ? notifTitle(prayer.name)
      : `🕌 ${prayer.name} Prayer Time`;
    const body = notifBody
      ? notifBody(prayer.name, prayer.arabicName)
      : `It's time for ${prayer.name} — ${prayer.arabicName}`;

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
        channelId: "prayers",
      },
    });
  }
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
}

export async function cancelMotivationNotifications(): Promise<void> {
  await cancelByKind("motivation");
}

export async function cancelQuranNotifications(): Promise<void> {
  await cancelByKind("quran");
}
