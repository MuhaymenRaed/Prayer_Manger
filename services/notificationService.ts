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

type Kind = "prayer" | "motivation" | "quran" | "pinned" | "test";

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

      // Remove first-generation channels ("athan-*"). A channel's sound can
      // never be changed after creation, so any device that created one
      // before the sounds were bundled would stay silent forever otherwise.
      const existing = await Notifications.getNotificationChannelsAsync();
      await Promise.all(
        existing
          .filter((c) => c.id.startsWith("athan-"))
          .map((c) => Notifications.deleteNotificationChannelAsync(c.id)),
      );
    }
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  await ensureNotificationChannels();
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Fire a test notification on the selected athan channel a few seconds from
 * now — lets the user hear exactly what the prayer alert will sound like
 * (and verifies device-level permissions/sound end-to-end).
 */
export async function scheduleAthanTest(
  soundId: string,
  title: string,
  body: string,
): Promise<void> {
  await ensureNotificationChannels();
  // Deliberately identical to a real prayer alert: same channel, same sound
  // value and the same DATE trigger — so if this plays, prayers will too.
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: getAthanSound(soundId).file,
      data: { kind: "test" as Kind },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 5000),
      channelId: athanChannelId("takbir", soundId),
    },
  });
}

/**
 * What is ACTUALLY scheduled right now — used by the in-app diagnostic so a
 * silent alert can be traced to a channel instead of guessed at.
 */
export async function describeScheduledPrayerAlerts(): Promise<{
  count: number;
  channelId: string | null;
  nextAt: Date | null;
}> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const prayers = all.filter(
    (n) => (n.content.data as { kind?: Kind } | null)?.kind === "prayer",
  );
  let channelId: string | null = null;
  let nextAt: Date | null = null;
  const trigger = prayers[0]?.trigger as
    | { channelId?: string; value?: number; date?: number }
    | undefined;
  if (trigger) {
    channelId = trigger.channelId ?? null;
    const ts = trigger.value ?? trigger.date;
    if (typeof ts === "number") nextAt = new Date(ts);
  }
  return { count: prayers.length, channelId, nextAt };
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
  const channelId = useAthan
    ? athanChannelId("takbir", athan!.soundId)
    : "prayers";

  // Send the FILENAME, never `true`. expo maps a boolean to
  // useDefaultSound(), which stamps the system tone onto the notification —
  // and ColorOS/MIUI honour that over the channel's custom sound, which is
  // exactly why the takbir was replaced by the default beep. A string makes
  // SoundResolver emit a real android.resource:// URI for raw/<sound>.
  const soundValue: string | boolean = useAthan
    ? getAthanSound(athan!.soundId).file
    : true;

  for (const prayer of prayers) {
    if (prayer.isInformational || prayer.isPassed) continue;
    if (prayer.time.getTime() <= now.getTime()) continue;

    const { title, body } = buildContent(prayer);

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: soundValue,
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

function pinnedContent(body: string) {
  return {
    title: null,
    body,
    sound: false,
    sticky: true,
    data: { kind: "pinned" as Kind },
  };
}

/**
 * Show/refresh the persistent next-prayer bar (silent, sticky). Re-posting
 * with the same identifier replaces the previous one in place.
 */
export async function showPinnedTimes(body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: PINNED_ID,
    content: pinnedContent(body),
    trigger: { channelId: "pinned" }, // presents immediately on this channel
  });
}

/**
 * Pre-schedule the bar's REPLACEMENT content as an exact alarm. Because it
 * shares PINNED_ID, when it fires Android swaps the presented bar in place —
 * this is how the pinned notification flips to the next prayer at the exact
 * prayer moment even while the app is closed (local notifications cannot run
 * code, so the future content is computed at scheduling time).
 * Only one pending update exists at a time; the background refresh task and
 * app opens keep re-arming the chain.
 */
export async function schedulePinnedUpdateAt(
  date: Date,
  body: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: PINNED_ID,
    content: pinnedContent(body),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: "pinned",
    },
  });
}

export async function dismissPinnedTimes(): Promise<void> {
  // Presented bar + any pending scheduled replacement.
  await Notifications.cancelScheduledNotificationAsync(PINNED_ID).catch(() => {});
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
