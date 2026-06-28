import { useEffect, useRef } from "react";

import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useSettings } from "../contexts/SettingsContext";
import { useTracker } from "../contexts/TrackerContext";
import { pullAll, pushSettings, pushTracker } from "../services/syncService";

/**
 * Headless cloud sync:
 *  - on sign-in, pulls remote state (remote wins if it has data, else seeds it)
 *  - while signed in, debounced-pushes local changes to Supabase
 * Rendered once inside all the providers.
 */
export function CloudSync() {
  const { user, configured } = useAuth();
  const { counts, replaceAll: replaceTracker } = useTracker();
  const { settings, replaceAll: replaceSettings } = useSettings();
  const { lang } = useLanguage();

  const pulledFor = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull once per signed-in user.
  useEffect(() => {
    if (!configured || !user) {
      pulledFor.current = null;
      return;
    }
    if (pulledFor.current === user.id) return;
    pulledFor.current = user.id;

    (async () => {
      try {
        const remote = await pullAll(user.id);
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
      } catch {
        // best-effort; stays offline-capable
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, user]);

  // Debounced push of local changes.
  useEffect(() => {
    if (!configured || !user || pulledFor.current !== user.id) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushTracker(user.id, counts).catch(() => {});
      pushSettings(user.id, settings, lang).catch(() => {});
    }, 1200);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [configured, user, counts, settings, lang]);

  return null;
}
