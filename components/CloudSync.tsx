import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTracker } from "../contexts/TrackerContext";
import { pullAll, pushSettings, pushTracker } from "../services/syncService";
import { setSyncStatus } from "../services/syncStatus";

/** Marks that this device already restored this account from the cloud. */
const PULLED_KEY = "@yaqeen_pulled_for";

/**
 * Headless cloud sync.
 *
 * Pull happens ONCE per account per device — on the sign-in that first
 * restores the data. After that the device is the source of truth and only
 * pushes. Re-pulling on every launch both hammered the database and could
 * overwrite edits made moments earlier (the remote read would land after a
 * local change and revert it).
 *
 * Signing in on another device performs that device's one-time pull, so the
 * data still follows the user everywhere.
 */
export function CloudSync() {
  const { user, configured } = useAuth();
  const { counts, replaceAll: replaceTracker } = useTracker();
  const { settings, replaceAll: replaceSettings } = useSettings();
  const { lang } = useLanguage();

  /** null = unknown yet, "" = no pull needed, id = pull completed for id. */
  const pulledFor = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One-time restore for this account on this device.
  useEffect(() => {
    if (!configured || !user) {
      pulledFor.current = null;
      setSyncStatus({ state: "idle" });
      return;
    }
    if (pulledFor.current === user.id) return;

    let cancelled = false;
    (async () => {
      // Already restored on a previous launch → skip straight to push-only.
      const done = await AsyncStorage.getItem(PULLED_KEY).catch(() => null);
      if (cancelled) return;
      if (done === user.id) {
        pulledFor.current = user.id;
        setSyncStatus({ state: "ok", syncedAt: Date.now() });
        return;
      }

      pulledFor.current = user.id;
      setSyncStatus({ state: "syncing" });
      try {
        const remote = await pullAll(user.id);
        if (cancelled) return;
        if (remote.counts) {
          await replaceTracker(remote.counts);
        } else {
          // First device for this account — seed the cloud with local data.
          await pushTracker(user.id, counts);
        }
        if (remote.settings) {
          await replaceSettings(remote.settings);
        } else {
          await pushSettings(user.id, settings, lang);
        }
        await AsyncStorage.setItem(PULLED_KEY, user.id).catch(() => {});
        setSyncStatus({ state: "ok", syncedAt: Date.now() });
      } catch (e) {
        if (cancelled) return;
        // Surfaced in Settings → account card. Never fail silently again.
        pulledFor.current = null; // allow a retry on the next app open
        setSyncStatus({
          state: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, user]);

  // Debounced push of local changes.
  useEffect(() => {
    if (!configured || !user || pulledFor.current !== user.id) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      (async () => {
        setSyncStatus({ state: "syncing" });
        try {
          await pushTracker(user.id, counts);
          await pushSettings(user.id, settings, lang);
          setSyncStatus({ state: "ok", syncedAt: Date.now() });
        } catch (e) {
          setSyncStatus({
            state: "error",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      })();
    }, 1200);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [configured, user, counts, settings, lang]);

  return null;
}
