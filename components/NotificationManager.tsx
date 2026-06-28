import { useEffect } from "react";

import { verseOfTheDay } from "../constants/quran";
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTracker } from "../contexts/TrackerContext";
import {
  cancelMotivationNotifications,
  cancelQuranNotifications,
  scheduleMotivationNotification,
  scheduleQuranNotification,
} from "../services/notificationService";

/**
 * Headless component: keeps the motivation + daily-Quran notifications in sync
 * with the user's settings, language and make-up-prayer progress. Rendered
 * once inside the app providers.
 */
export function NotificationManager() {
  const { settings } = useSettings();
  const { totalRemaining } = useTracker();
  const { t, lang } = useLanguage();

  // Motivation / accountability reminder.
  useEffect(() => {
    if (settings.motivation && settings.prayerNotifications) {
      scheduleMotivationNotification(totalRemaining, {
        motivateTitle: t.notif.motivateTitle,
        motivateBody: t.notif.motivateBody,
        regressTitle: t.notif.regressTitle,
        regressBody: t.notif.regressBody,
      }).catch(() => {});
    } else {
      cancelMotivationNotifications().catch(() => {});
    }
  }, [settings.motivation, settings.prayerNotifications, totalRemaining, t]);

  // Daily verse of the day.
  useEffect(() => {
    if (settings.quranDaily && settings.prayerNotifications) {
      scheduleQuranNotification(verseOfTheDay(), lang, {
        quranTitle: t.notif.quranTitle,
        quranBody: t.notif.quranBody,
      }).catch(() => {});
    } else {
      cancelQuranNotifications().catch(() => {});
    }
  }, [settings.quranDaily, settings.prayerNotifications, lang, t]);

  return null;
}
