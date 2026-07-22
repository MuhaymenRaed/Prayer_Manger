import { useEffect, useState } from "react";

/**
 * Tiny observable for cloud-sync health.
 *
 * The app previously swallowed every Supabase error, so a database that
 * rejected all writes looked identical to a healthy one. Sync now reports
 * its real state here and the account card surfaces it to the user.
 */
export type SyncState = "idle" | "syncing" | "ok" | "error";

export interface SyncStatus {
  state: SyncState;
  /** Failure reason, shown verbatim so problems are diagnosable. */
  message?: string;
  /** Epoch ms of the last successful sync. */
  syncedAt?: number;
}

let current: SyncStatus = { state: "idle" };
const listeners = new Set<(s: SyncStatus) => void>();

export function setSyncStatus(next: SyncStatus): void {
  current = next;
  listeners.forEach((l) => l(next));
}

export function getSyncStatus(): SyncStatus {
  return current;
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(current);
  useEffect(() => {
    listeners.add(setStatus);
    setStatus(current);
    return () => {
      listeners.delete(setStatus);
    };
  }, []);
  return status;
}
