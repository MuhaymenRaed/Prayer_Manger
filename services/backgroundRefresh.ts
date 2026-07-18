import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { refreshAllAlerts } from "./alertsRefresher";

const BG_TASK = "yaqeen-alerts-refresh";

// Runs headlessly via WorkManager (~every 15+ min at the OS's discretion):
// keeps the 7-day alert window topped up and re-arms the pinned-bar chain
// (fresh countdown + next flip) while the app stays closed.
TaskManager.defineTask(BG_TASK, async () => {
  try {
    await refreshAllAlerts();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundRefresh(): Promise<void> {
  try {
    await BackgroundTask.registerTaskAsync(BG_TASK, { minimumInterval: 15 });
  } catch {
    // Unavailable (e.g. Expo Go) — foreground refreshes still cover it.
  }
}
