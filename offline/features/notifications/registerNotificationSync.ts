import type { SQLiteDatabase } from "expo-sqlite";

import { api, ApiError, clearApiCache } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { NotificationRepository } from "./NotificationRepository";

export const registerNotificationSync = (
  registry: SyncRegistry,
  database: SQLiteDatabase,
) => {
  const repository = new NotificationRepository(database);
  registry.registerProcessor("notification", async (operation, context) => {
    const payload = operation.payload as { serverId: number };
    try {
      await api.markServerNotificationRead(payload.serverId, context.token);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      // Only the API's own "Notification not found" means it is gone. A bare
      // 404 is a missing route or a proxy: the read never reached the server,
      // so keep it queued instead of settling it locally.
      if (!error.hasErrorBody) {
        throw new Error("Notification sync is temporarily unavailable.");
      }
    }
    await repository.acknowledge(
      context.userId,
      context.messId!,
      payload.serverId,
    );
  });

  registry.registerPuller("notifications", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    clearApiCache();
    const result = await api.getNotifications(context.token, context.messId);
    await repository.merge(
      context.userId,
      context.messId,
      result.notifications,
    );
    return { cursor: null };
  });
};
