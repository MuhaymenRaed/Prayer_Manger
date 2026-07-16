import { useEffect } from "react";

import { getLocationById } from "../constants/locations";
import { verseOfTheDay } from "../constants/quran";
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTracker } from "../contexts/TrackerContext";
import {
  cancelAllNotifications,
  cancelMotivationNotifications,
  cancelQuranNotifications,
  dismissPinnedTimes,
  scheduleMotivationNotification,
  scheduleQuranNotification,
  scheduleUpcomingPrayerAlerts,
  showPinnedTimes,
} from "../services/notificationService";
import {
  formatTime,
  getShiaPrayerTimes,
} from "../services/prayerTimesService";
import { getSavedLocation } from "../services/storageService";

const DEFAULT_LAT = 31.9928;
const DEFAULT_LON = 44.3357;

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
  useEffect(() => {
    (async () => {
      if (!settings.prayerNotifications) {
        await cancelAllNotifications();
        return;
      }

      // Resolve coordinates: chosen city, else last saved GPS fix, else Najaf.
      let lat = DEFAULT_LAT;
      let lon = DEFAULT_LON;
      let tz: string | undefined;
      const preset =
        settings.locationId !== "auto"
          ? getLocationById(settings.locationId)
          : undefined;
      if (preset) {
        lat = preset.latitude;
        lon = preset.longitude;
        tz = preset.timezone;
      } else {
        const saved = await getSavedLocation();
        if (saved) {
          lat = saved.latitude;
          lon = saved.longitude;
        }
        tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      const { prayers } = getShiaPrayerTimes(lat, lon);

      // A full week of alerts — fires OS-side even if the app stays closed.
      await scheduleUpcomingPrayerAlerts(
        lat,
        lon,
        (p) => {
          const name = t.athanNames[p.name] ?? p.name;
          return {
            title: t.notif.title(name),
            body: t.notif.body(name, p.arabicName),
          };
        },
        { mode: settings.athanMode, soundId: settings.athanSoundId },
      );

      // Pinned next-prayer bar (preference-aware: skips hidden Asr/Isha).
      if (settings.pinnedTimes) {
        const now = Date.now();
        const next = prayers.find(
          (p) =>
            !p.isInformational &&
            (settings.showAsrIsha || (p.name !== "Asr" && p.name !== "Isha")) &&
            p.time.getTime() > now,
        );
        if (next) {
          const mins = Math.max(
            0,
            Math.floor((next.time.getTime() - now) / 60000),
          );
          const remaining = t.prayerTimes.durationShort(
            Math.floor(mins / 60),
            mins % 60,
          );
          await showPinnedTimes(
            t.notif.pinnedNext(
              t.athanNames[next.name] ?? next.name,
              formatTime(next.time, lang, tz),
              remaining,
            ),
          );
        } else {
          await dismissPinnedTimes();
        }
      } else {
        await dismissPinnedTimes();
      }
    })().catch(() => {});
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
