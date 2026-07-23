import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  cancelAllNotifications,
  requestNotificationPermissions,
} from "../services/notificationService";
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
} from "../services/storageService";
import { AppSettings } from "../types/prayer";

interface SettingsContextValue {
  settings: AppSettings;
  toggleNotifications: () => Promise<void>;
  toggleSound: () => Promise<void>;
  toggleVibration: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => Promise<void>;
  /** Merge a partial settings object (used when syncing from the cloud). */
  replaceAll: (partial: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const persist = useCallback(async (next: AppSettings) => {
    // Write BEFORE updating state: the state change re-runs the notification
    // rescheduler, which reads settings back from storage. Setting state first
    // let it read the previous value and reschedule with a stale athan sound.
    await saveSettings(next);
    setSettings(next);
  }, []);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      const next = { ...settings, [key]: value };
      await persist(next);
    },
    [settings, persist],
  );

  const toggleNotifications = useCallback(async () => {
    const next = !settings.prayerNotifications;
    if (next) {
      await requestNotificationPermissions();
    } else {
      await cancelAllNotifications();
    }
    await updateSetting("prayerNotifications", next);
  }, [settings.prayerNotifications, updateSetting]);

  const toggleSound = useCallback(async () => {
    await updateSetting("sound", !settings.sound);
  }, [settings.sound, updateSetting]);

  const toggleVibration = useCallback(async () => {
    await updateSetting("vibration", !settings.vibration);
  }, [settings.vibration, updateSetting]);

  const replaceAll = useCallback(
    async (partial: Partial<AppSettings>) => {
      await persist({ ...settings, ...partial });
    },
    [settings, persist],
  );

  const value = useMemo(
    () => ({
      settings,
      toggleNotifications,
      toggleSound,
      toggleVibration,
      updateSetting,
      replaceAll,
    }),
    [
      settings,
      toggleNotifications,
      toggleSound,
      toggleVibration,
      updateSetting,
      replaceAll,
    ],
  );

  return (
    <SettingsContext.Provider
      value={value}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
