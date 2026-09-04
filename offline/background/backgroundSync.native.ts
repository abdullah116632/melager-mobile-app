import NetInfo from "@react-native-community/netinfo";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";

import { getPersistedSyncSession } from "@/storage/session/persistedSyncSession";

import { getOfflineDatabase } from "../database/connection";
import { getOfflineRuntime } from "../runtime/getOfflineRuntime";

export const OFFLINE_BACKGROUND_SYNC_TASK = "melager-offline-sync-v1";
const MINIMUM_BACKGROUND_INTERVAL_MINUTES = 15;

if (!TaskManager.isTaskDefined(OFFLINE_BACKGROUND_SYNC_TASK)) {
  TaskManager.defineTask(OFFLINE_BACKGROUND_SYNC_TASK, async () => {
    try {
      const [network, session] = await Promise.all([
        NetInfo.fetch(),
        getPersistedSyncSession(),
      ]);
      const isOnline =
        network.isConnected === true && network.isInternetReachable !== false;
      if (!isOnline || !session) return BackgroundTask.BackgroundTaskResult.Success;

      const database = await getOfflineDatabase();
      const summary = await getOfflineRuntime(database).engine.sync(session);
      return summary.failed === 0
        ? BackgroundTask.BackgroundTaskResult.Success
        : BackgroundTask.BackgroundTaskResult.Failed;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerBackgroundSyncAsync(): Promise<boolean> {
  const [taskManagerAvailable, status] = await Promise.all([
    TaskManager.isAvailableAsync(),
    BackgroundTask.getStatusAsync(),
  ]);
  if (
    !taskManagerAvailable ||
    status !== BackgroundTask.BackgroundTaskStatus.Available
  ) {
    return false;
  }

  const registered = await TaskManager.isTaskRegisteredAsync(
    OFFLINE_BACKGROUND_SYNC_TASK,
  );
  if (!registered) {
    await BackgroundTask.registerTaskAsync(OFFLINE_BACKGROUND_SYNC_TASK, {
      minimumInterval: MINIMUM_BACKGROUND_INTERVAL_MINUTES,
    });
  }
  return true;
}
