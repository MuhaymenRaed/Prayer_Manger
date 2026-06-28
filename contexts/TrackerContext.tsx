import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getTrackerCounts,
  saveTrackerCounts,
} from "../services/storageService";
import { PrayerProgress, TrackerCounts, TrackerKey } from "../types/prayer";

interface TrackerContextValue {
  counts: TrackerCounts;
  /** Total prayers still owed across all categories. */
  totalRemaining: number;
  /** Total made up across all categories. */
  totalCompleted: number;
  /** Set the absolute number of missed prayers for one category. */
  setMissed: (key: TrackerKey, value: number) => Promise<void>;
  /** Mark one prayer as made up (qadha). Returns remaining for that key. */
  markCompleted: (key: TrackerKey) => Promise<number>;
  /** Undo a made-up prayer (in case of mistake). */
  undoCompleted: (key: TrackerKey) => Promise<void>;
  /** Record a newly missed prayer/day. Returns remaining for that key. */
  addMissed: (key: TrackerKey, amount?: number) => Promise<number>;
  resetOne: (key: TrackerKey) => Promise<void>;
  resetAll: () => Promise<void>;
  /** Overwrite the whole tracker (used when syncing from the cloud). */
  replaceAll: (next: TrackerCounts) => Promise<void>;
}

const TrackerContext = createContext<TrackerContextValue | undefined>(
  undefined,
);

const ZERO = (): PrayerProgress => ({ missed: 0, completed: 0 });

const EMPTY: TrackerCounts = {
  fajr: ZERO(),
  dhuhr: ZERO(),
  asr: ZERO(),
  maghrib: ZERO(),
  isha: ZERO(),
  ayat: ZERO(),
};

export function remaining(p: PrayerProgress): number {
  return Math.max(0, p.missed - p.completed);
}

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<TrackerCounts>(EMPTY);

  useEffect(() => {
    getTrackerCounts().then(setCounts);
  }, []);

  const persist = useCallback(async (next: TrackerCounts) => {
    setCounts(next);
    await saveTrackerCounts(next);
  }, []);

  const setMissed = useCallback(
    async (key: TrackerKey, value: number) => {
      const missed = Math.max(0, Math.floor(value));
      const completed = Math.min(counts[key].completed, missed);
      await persist({ ...counts, [key]: { missed, completed } });
    },
    [counts, persist],
  );

  const markCompleted = useCallback(
    async (key: TrackerKey): Promise<number> => {
      const cur = counts[key];
      const completed = Math.min(cur.missed, cur.completed + 1);
      const next = { ...counts, [key]: { ...cur, completed } };
      await persist(next);
      return remaining(next[key]);
    },
    [counts, persist],
  );

  const undoCompleted = useCallback(
    async (key: TrackerKey) => {
      const cur = counts[key];
      const completed = Math.max(0, cur.completed - 1);
      await persist({ ...counts, [key]: { ...cur, completed } });
    },
    [counts, persist],
  );

  const addMissed = useCallback(
    async (key: TrackerKey, amount = 1): Promise<number> => {
      const cur = counts[key];
      const missed = Math.max(0, cur.missed + amount);
      const next = { ...counts, [key]: { ...cur, missed } };
      await persist(next);
      return remaining(next[key]);
    },
    [counts, persist],
  );

  const resetOne = useCallback(
    async (key: TrackerKey) => {
      await persist({ ...counts, [key]: ZERO() });
    },
    [counts, persist],
  );

  const resetAll = useCallback(async () => {
    await persist({
      fajr: ZERO(),
      dhuhr: ZERO(),
      asr: ZERO(),
      maghrib: ZERO(),
      isha: ZERO(),
      ayat: ZERO(),
    });
  }, [persist]);

  const replaceAll = useCallback(
    async (next: TrackerCounts) => {
      await persist(next);
    },
    [persist],
  );

  const { totalRemaining, totalCompleted } = useMemo(() => {
    let rem = 0;
    let done = 0;
    for (const p of Object.values(counts)) {
      rem += remaining(p);
      done += p.completed;
    }
    return { totalRemaining: rem, totalCompleted: done };
  }, [counts]);

  const value = useMemo(
    () => ({
      counts,
      totalRemaining,
      totalCompleted,
      setMissed,
      markCompleted,
      undoCompleted,
      addMissed,
      resetOne,
      resetAll,
      replaceAll,
    }),
    [
      counts,
      totalRemaining,
      totalCompleted,
      setMissed,
      markCompleted,
      undoCompleted,
      addMissed,
      resetOne,
      resetAll,
      replaceAll,
    ],
  );

  return (
    <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>
  );
}

export function useTracker(): TrackerContextValue {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error("useTracker must be used inside TrackerProvider");
  return ctx;
}
