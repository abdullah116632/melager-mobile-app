import type { SQLiteDatabase } from "expo-sqlite";

import { api, ApiError, type ApiNotice } from "@/lib/api";

import type { OutboxOperation } from "../../outbox/types";
import type { SyncRegistry } from "../../sync/registry";
import { NoticeRepository } from "./NoticeRepository";
import type { NoticeMutationPayload, NoticeSyncOperation } from "./types";

const getPayload = (operation: OutboxOperation) =>
  operation.payload as NoticeMutationPayload;

export function registerNoticeSync(
  registry: SyncRegistry,
  database: SQLiteDatabase,
): void {
  const repository = new NoticeRepository(database);

  registry.registerProcessor("notice", async (operation, context) => {
    const payload = getPayload(operation);
    const localId = payload.localId;
    if (!localId) throw new Error("Notice outbox item has no local id.");
    const syncOperation: NoticeSyncOperation =
      operation.operation === "create"
        ? "notice_create"
        : operation.operation === "delete"
          ? "notice_delete"
          : "notice_update";
    try {
      const response = await api.syncNoticeMutation<{
        notice?: ApiNotice;
      }>(
        operation.id,
        syncOperation,
        payload as Record<string, unknown>,
        context.token,
        context.messId!,
      );
      if (!response.notice) throw new Error("Server returned no notice.");
      await repository.acknowledge(localId, response.notice, operation.id);
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
    try {
      const response = await api.syncNoticeMutation<{
        notices?: ApiNotice[];
      }>(
        operation.id,
        "notice_reorder",
        { noticeIds: serverIds },
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
        (error.status === 400 || error.status === 404)
      ) {
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
      await api.syncNoticeMutation(
        operation.id,
        "notifications_read",
        {},
        context.token,
        context.messId!,
      );
      await repository.acknowledgeRead(context.userId, context.messId!);
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
