import type { SQLiteDatabase } from "expo-sqlite";

import { api, ApiError, type ApiNotice } from "@/lib/api";

import type { OutboxOperation } from "../../outbox/types";
import { SyncRejectionRepository } from "../../repositories/syncRejectionRepository";
import type { SyncRegistry } from "../../sync/registry";
import { NoticeRepository } from "./NoticeRepository";
import type { NoticeMutationPayload, NoticeSyncOperation } from "./types";

// The server's wording for each case, so only real conflicts are reported.
const STILL_PROCESSING = "Mutation is still being processed";
const NOTICE_CHANGED = "Notice changed on another device";
const ORDER_CHANGED = "Notice order changed on another device";

const getPayload = (operation: OutboxOperation) =>
  operation.payload as NoticeMutationPayload;

export function registerNoticeSync(
  registry: SyncRegistry,
  database: SQLiteDatabase,
): void {
  const repository = new NoticeRepository(database);
  const rejections = new SyncRejectionRepository(database);

  registry.registerProcessor("notice", async (operation, context) => {
    const payload = getPayload(operation);
    const localId = payload.localId;
    if (!localId) throw new Error("Notice outbox item has no local id.");
    if (operation.operation !== "create" && !payload.serverId) {
      // Queued before its create was confirmed: wait for the create to hand
      // over a server id. If the create never landed there is nothing to
      // change server-side, and a delete only has to settle locally.
      if (await repository.isCreatePending(context.userId, localId)) {
        throw new Error("Notice change is waiting for its create to sync.");
      }
      if (operation.operation === "delete")
        await repository.acknowledgeDelete(localId);
      return;
    }
    if (operation.operation !== "create" && !payload.baseUpdatedAt) {
      const local = await repository.getByLocalId(localId);
      if (local?.server_updated_at) {
        payload.baseUpdatedAt = local.server_updated_at;
      }
    }
    const syncOperation: NoticeSyncOperation =
      operation.operation === "create"
        ? "notice_create"
        : operation.operation === "delete"
          ? "notice_delete"
          : "notice_update";
    try {
      const response = await api.syncNoticeMutation<{
        notice?: ApiNotice;
        success?: boolean;
        serverId?: number;
      }>(
        operation.id,
        syncOperation,
        payload as Record<string, unknown>,
        context.token,
        context.messId!,
      );
      if (operation.operation === "delete") {
        if (!response.success) {
          throw new Error("Server did not confirm notice deletion.");
        }
        await repository.acknowledgeDelete(localId);
        return;
      }
      if (!response.notice) throw new Error("Server returned no notice.");
      await repository.acknowledge(localId, response.notice, operation.id);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      const noticeTitle = async () =>
        payload.title ??
        (await repository.getByLocalId(localId))?.title ??
        "Untitled";
      // An earlier attempt of this same change is still completing.
      if (error.status === 409 && error.message === STILL_PROCESSING) {
        throw new Error("Notice change is still being confirmed.");
      }
      // Only a real "this notice is gone" answer may drop the local row. A
      // bare 404 also means the sync route is missing, and deleting local
      // work because the backend is out of date would lose the user's edit.
      if (
        error.status === 404 &&
        error.hasErrorBody &&
        operation.operation !== "create"
      ) {
        if (operation.operation !== "delete") {
          await rejections.add(
            context.userId,
            context.messId!,
            "notices",
            `Notice "${await noticeTitle()}" was deleted by another admin, so your edit was not saved.`,
          );
        }
        await repository.acknowledgeDelete(localId);
        return;
      }
      // A create conflicts only on its own mutation id, which means an earlier
      // attempt is still completing server-side. Keep it queued and retry so
      // the offline notice is never dropped.
      if (error.status === 409 && operation.operation === "create") {
        throw new Error("Notice create is still being confirmed.");
      }
      if (error.status === 409 && error.message === NOTICE_CHANGED) {
        await rejections.add(
          context.userId,
          context.messId!,
          "notices",
          operation.operation === "delete"
            ? `Notice "${await noticeTitle()}" was edited by another admin, so it was not deleted.`
            : `Notice "${await noticeTitle()}" was changed by another admin first, so your edit was not saved.`,
        );
      }
      throw error;
    }
  });

  registry.registerProcessor("notice_reorder", async (operation, context) => {
    const payload = getPayload(operation);
    if (!payload.localIds || payload.localIds.length === 0) {
      throw new Error("Notice reorder outbox data is invalid.");
    }
    const serverIds: number[] = [];
    for (const localId of payload.localIds) {
      const row = await repository.getByLocalId(localId);
      if (!row || row.server_id === null || row.is_deleted === 1) {
        throw new Error("Notice order is waiting for item sync.");
      }
      serverIds.push(row.server_id);
    }
    const baseServerIds: number[] = [];
    for (const localId of payload.baseLocalIds ?? []) {
      const row = await repository.getByLocalId(localId);
      if (!row || row.server_id === null || row.is_deleted === 1) {
        throw new Error("Notice order base is waiting for item sync.");
      }
      baseServerIds.push(row.server_id);
    }
    try {
      const response = await api.syncNoticeMutation<{
        notices?: ApiNotice[];
      }>(
        operation.id,
        "notice_reorder",
        { noticeIds: serverIds, baseNoticeIds: baseServerIds },
        context.token,
        context.messId!,
      );
      await repository.acknowledgeReorder(
        context.messId!,
        response.notices ?? [],
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 400 || error.status === 404 || error.status === 409)
      ) {
        if (error.status === 409 && error.message === ORDER_CHANGED) {
          await rejections.add(
            context.userId,
            context.messId!,
            "notices",
            "Another admin changed the notice order first, so your new order was not saved.",
          );
        }
        await repository.discardReorder(operation.id, context.messId!);
        const [remote, unread] = await Promise.all([
          api.getNotices(context.token, context.messId!),
          api.getUnreadNoticesCount(context.token, context.messId!),
        ]);
        await repository.replaceRemoteSnapshot(
          context.userId,
          context.messId!,
          remote.notices,
          unread.unreadCount,
        );
        return;
      }
      throw error;
    }
  });

  registry.registerProcessor(
    "notice_notification",
    async (operation, context) => {
      const response = await api.syncNoticeMutation<{ unreadCount: number }>(
        operation.id,
        "notifications_read",
        getPayload(operation) as Record<string, unknown>,
        context.token,
        context.messId!,
      );
      await repository.acknowledgeRead(
        context.userId,
        context.messId!,
        response.unreadCount,
      );
    },
  );

  registry.registerPuller("notices", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    const [noticeResponse, unreadResponse] = await Promise.all([
      api.getNotices(context.token, context.messId),
      api.getUnreadNoticesCount(context.token, context.messId),
    ]);
    await repository.replaceRemoteSnapshot(
      context.userId,
      context.messId,
      noticeResponse.notices,
      unreadResponse.unreadCount,
    );
    return { cursor: null };
  });
}
