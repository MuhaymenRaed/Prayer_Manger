import { useEffect } from "react";

import { verseOfTheDay } from "../constants/quran";
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTracker } from "../contexts/TrackerContext";
import { refreshAllAlerts } from "../services/alertsRefresher";
import {
  cancelMotivationNotifications,
  cancelQuranNotifications,
  scheduleMotivationNotification,
  scheduleQuranNotification,
} from "../services/notificationService";

/**
 * Headless component: keeps ALL notifications in sync with the user's
 * settings, language and progress. Crucially, prayer alerts (and the pinned
 * bar) are scheduled here at APP STARTUP — not only when the prayer-times
 * tab is opened — so a fresh install/update always replaces any stale
 * schedules from a previous version (e.g. ones pointing at the default
 * sound channel instead of the selected takbir).
 */
export function NotificationManager() {
  const { settings } = useSettings();
  const { totalRemaining } = useTracker();
  const { t, lang } = useLanguage();

  // Prayer alerts + pinned bar — on startup and whenever anything relevant
  // changes (athan sound/mode, location, language, visibility prefs).
  // The shared refresher reads settings/language from storage, so it also
  // powers the headless background task with identical behavior.
  useEffect(() => {
    refreshAllAlerts().catch(() => {});
  }, [
    settings.prayerNotifications,
    settings.vibration,
    settings.athanMode,
    settings.athanSoundId,
    settings.pinnedTimes,
    settings.showAsrIsha,
    settings.locationId,
    lang,
    t,
  ]);

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
