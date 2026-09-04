import type { SQLiteDatabase } from "expo-sqlite";

import {
  api,
  ApiError,
  type ApiBazarAssignment,
  type ApiBazarItem,
} from "@/lib/api";

import type { OutboxOperation } from "../../outbox/types";
import type { SyncRegistry } from "../../sync/registry";
import { BazarRepository } from "./BazarRepository";
import type {
  BazarMutationPayload,
  BazarSyncOperation,
  BazarSyncResponse,
} from "./types";

const getPayload = (operation: OutboxOperation): BazarMutationPayload =>
  operation.payload as BazarMutationPayload;

export function registerBazarSync(
  registry: SyncRegistry,
  database: SQLiteDatabase,
): void {
  const repository = new BazarRepository(database);

  registry.registerProcessor("bazar_item", async (operation, context) => {
    const payload = getPayload(operation);
    const localId = payload.localId;
    if (!localId) throw new Error("Bazar outbox item has no local id.");

    let syncOperation: BazarSyncOperation;
    if (operation.operation === "create") syncOperation = "item_create";
    else if (operation.operation === "delete") syncOperation = "item_delete";
    else if (payload.completed !== undefined && payload.name === undefined)
      syncOperation = "item_status";
    else syncOperation = "item_update";

    try {
      const response = await api.syncBazarMutation<BazarSyncResponse>(
        operation.id,
        syncOperation,
        payload as Record<string, unknown>,
        context.token,
        context.messId!,
      );
      if (syncOperation === "item_delete") {
        await repository.acknowledgeDelete(localId);
      } else if (response.item) {
        await repository.acknowledgeItem(localId, response.item, operation.id);
      } else {
        throw new Error("Server returned no bazar item.");
      }
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 404 &&
        operation.operation !== "create"
      ) {
        await repository.acknowledgeDelete(localId);
        return;
      }
      throw error;
    }
  });

  registry.registerProcessor(
    "bazar_assignments",
    async (operation, context) => {
      const payload = getPayload(operation);
      if (payload.weekday === undefined || !payload.consumerIds) {
        throw new Error("Bazar assignment outbox data is invalid.");
      }
      const response = await api.syncBazarMutation<BazarSyncResponse>(
        operation.id,
        "assignments_set",
        payload as Record<string, unknown>,
        context.token,
        context.messId!,
      );
      await repository.acknowledgeAssignments(
        context.messId!,
        payload.weekday,
        response.assignments ?? [],
      );
    },
  );

  registry.registerProcessor(
    "bazar_notification",
    async (operation, context) => {
      const payload = getPayload(operation);
      const isNotify = payload.weekday !== undefined;
      await api.syncBazarMutation<BazarSyncResponse>(
        operation.id,
        isNotify ? "notify_members" : "notifications_read",
        payload as Record<string, unknown>,
        context.token,
        context.messId!,
      );
      if (!isNotify) {
        await repository.acknowledgeNotificationsRead(
          context.userId,
          context.messId!,
        );
      }
    },
  );

  registry.registerPuller("bazar", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    const [bazar, notifications] = await Promise.all([
      api.getBazar(context.token, context.messId),
      api.getUnreadBazarAssignmentCount(context.token, context.messId),
    ]);
    await repository.replaceRemoteSnapshot(
      context.userId,
      context.messId,
      bazar.items as ApiBazarItem[],
      bazar.assignments as ApiBazarAssignment[],
      notifications.unreadCount,
    );
    return { cursor: null };
  });
}
