import type { SQLiteDatabase } from "expo-sqlite";

import {
  api,
  ApiError,
  type ApiBazarAssignment,
  type ApiBazarItem,
} from "@/lib/api";

import { BAZAR_WEEKDAY_NAMES, formatBazarDate } from "@/utils/bazar";
import { addDashboardDays, getDhakaDate } from "@/utils/dashboard";

import type { OutboxOperation } from "../../outbox/types";
import { SyncRejectionRepository } from "../../repositories/syncRejectionRepository";
import type { SyncRegistry } from "../../sync/registry";
import type { SyncContext } from "../../sync/types";
import { BazarRepository } from "./BazarRepository";
import type {
  BazarMutationPayload,
  BazarSyncOperation,
  BazarSyncResponse,
} from "./types";

// The server's wording for each case, so only real conflicts are reported.
const STILL_PROCESSING = "Mutation is still being processed";
const ITEM_CHANGED = "Bazar item changed on another device";
const DUPLICATE_NAME = "An item with this name is already on that day's list";
const ASSIGNMENTS_CHANGED = "Bazar assignments changed on another device";

const getPayload = (operation: OutboxOperation): BazarMutationPayload =>
  operation.payload as BazarMutationPayload;

/**
 * Items live on every calendar date forever, so a pull only carries the dates
 * around today. The server clamps to the same span when no range is sent.
 */
const ITEM_WINDOW_DAYS = 180;

/**
 * A bare 404 (no JSON body) means the sync route itself is missing or a proxy
 * answered, and "still being processed" means an earlier attempt of the same
 * change has not finished. Neither is a rejection, so both are retried instead
 * of being dead-lettered.
 */
const sendBazarMutation = async (
  operation: OutboxOperation,
  syncOperation: Parameters<typeof api.syncBazarMutation>[1],
  payload: BazarMutationPayload,
  context: SyncContext,
): Promise<BazarSyncResponse> => {
  try {
    return await api.syncBazarMutation<BazarSyncResponse>(
      operation.id,
      syncOperation,
      payload as Record<string, unknown>,
      context.token,
      context.messId!,
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 404 &&
      !error.hasErrorBody
    ) {
      throw new Error("Bazar sync is temporarily unavailable.");
    }
    if (
      error instanceof ApiError &&
      error.status === 409 &&
      error.message === STILL_PROCESSING
    ) {
      throw new Error("Bazar change is still being confirmed.");
    }
    throw error;
  }
};

export function registerBazarSync(
  registry: SyncRegistry,
  database: SQLiteDatabase,
): void {
  const repository = new BazarRepository(database);
  const rejections = new SyncRejectionRepository(database);

  registry.registerProcessor("bazar_item", async (operation, context) => {
    const payload = getPayload(operation);
    const localId = payload.localId;
    if (!localId) throw new Error("Bazar outbox item has no local id.");
    if (operation.operation !== "create" && !payload.serverId) {
      // Queued before its create was confirmed: wait for the create to hand
      // over a server id. If the create never landed there is nothing to
      // change server-side, and a delete only has to settle locally.
      if (await repository.isCreatePending(context.userId, localId)) {
        throw new Error("Bazar change is waiting for its create to sync.");
      }
      if (operation.operation === "delete")
        await repository.acknowledgeDelete(localId);
      return;
    }
    if (operation.operation !== "create" && !payload.baseUpdatedAt) {
      const local = await repository.getItemByLocalId(localId);
      if (local?.server_updated_at)
        payload.baseUpdatedAt = local.server_updated_at;
    }

    let syncOperation: BazarSyncOperation;
    if (operation.operation === "create") syncOperation = "item_create";
    else if (operation.operation === "delete") syncOperation = "item_delete";
    else if (payload.completed !== undefined && payload.name === undefined)
      syncOperation = "item_status";
    else syncOperation = "item_update";

    /** What to tell the admin when another admin got there first. */
    const describeRejection = async (error: ApiError) => {
      const row = await repository.getItemByLocalId(localId);
      const name = payload.name ?? row?.name ?? "A bazar item";
      const bazarDate = payload.bazarDate ?? row?.bazar_date;
      const list = bazarDate
        ? `the ${formatBazarDate(bazarDate)} list`
        : "that day's list";
      if (error.status === 409 && error.message === DUPLICATE_NAME) {
        return operation.operation === "create"
          ? `"${name}" is already on ${list}, so it was not added again.`
          : `An item named "${name}" is already on ${list}, so your change was not saved.`;
      }
      if (error.status === 409 && error.message === ITEM_CHANGED) {
        return `"${name}" on ${list} was changed by another admin first, so your change was not saved.`;
      }
      if (
        error.status === 404 &&
        operation.operation !== "create" &&
        operation.operation !== "delete"
      ) {
        return `"${name}" on ${list} was deleted by another admin, so your change was not saved.`;
      }
      return null;
    };

    try {
      const response = await sendBazarMutation(
        operation,
        syncOperation,
        payload,
        context,
      );
      if (syncOperation === "item_delete") {
        await repository.acknowledgeDelete(localId);
      } else if (response.item) {
        await repository.acknowledgeItem(localId, response.item, operation.id);
      } else {
        throw new Error("Server returned no bazar item.");
      }
    } catch (error) {
      if (error instanceof ApiError && error.hasErrorBody) {
        const message = await describeRejection(error);
        if (message) {
          await rejections.add(
            context.userId,
            context.messId!,
            "bazar",
            message,
          );
        }
      }
      // A real "not found" answer (with a JSON body) means the item is gone.
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
      let response: BazarSyncResponse;
      try {
        response = await sendBazarMutation(
          operation,
          "assignments_set",
          payload,
          context,
        );
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === 409 &&
          error.message === ASSIGNMENTS_CHANGED
        ) {
          await rejections.add(
            context.userId,
            context.messId!,
            "bazar",
            `Bazar duty for ${
              BAZAR_WEEKDAY_NAMES[payload.weekday] ?? "that day"
            } was changed by another admin first, so your change was not saved.`,
          );
        }
        throw error;
      }
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
      const isNotify = payload.bazarDate !== undefined;
      await sendBazarMutation(
        operation,
        isNotify ? "notify_members" : "notifications_read",
        payload,
        context,
      );
      if (!isNotify) {
        await repository.acknowledgeNotificationsRead(
          context.userId,
          context.messId!,
        );
      }
    },
  );

  registry.registerProcessor("bazar_expense", async (operation, context) => {
    const payload = getPayload(operation);
    if (!payload.bazarDate) {
      throw new Error("Bazar expense outbox data is invalid.");
    }
    await sendBazarMutation(operation, "add_to_expense", payload, context);
  });

  registry.registerPuller("bazar", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    const today = getDhakaDate();
    const from = addDashboardDays(today, -ITEM_WINDOW_DAYS);
    const to = addDashboardDays(today, ITEM_WINDOW_DAYS);
    const [bazar, notifications] = await Promise.all([
      api.getBazar(context.token, context.messId, from, to),
      api.getUnreadBazarAssignmentCount(context.token, context.messId),
    ]);
    await repository.replaceRemoteSnapshot(
      context.userId,
      context.messId,
      bazar.items as ApiBazarItem[],
      bazar.assignments as ApiBazarAssignment[],
      notifications.unreadCount,
      bazar.window ?? { from, to },
    );
    return { cursor: null };
  });
}
