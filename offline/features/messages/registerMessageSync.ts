import type { SQLiteDatabase } from "expo-sqlite";
import {
  api,
  invalidateApiCache,
  type ApiMessage,
  type MessageReactionKind,
} from "@/lib/api";
import { emitMessageLifecycle } from "./messageLifecycle";
import type { SyncRegistry } from "../../sync/registry";
import { MessageRepository } from "./MessageRepository";
export const registerMessageSync = (
  registry: SyncRegistry,
  database: SQLiteDatabase,
) => {
  const repository = new MessageRepository(database);
  registry.registerProcessor("message", async (op, ctx) => {
    const p = op.payload as {
      localId: string;
      body: string;
      replyToMessageId?: number | null;
    };
    try {
      await repository.markPending(p.localId);
      const r = await api.syncMessage(
        op.id,
        ctx.messId!,
        p.body,
        ctx.token,
        p.replyToMessageId ?? null,
      );
      await repository.acknowledge(p.localId, r.message);
    } catch (e) {
      await repository.failed(p.localId);
      throw e;
    }
  });
  registry.registerProcessor("message_reaction", async (op, ctx) => {
    const payload = op.payload as {
      messageServerId: number;
      reaction: MessageReactionKind | null;
    };
    await api.setMessageReaction(
      ctx.messId!,
      payload.messageServerId,
      payload.reaction,
      ctx.token,
    );
    await repository.acknowledgeReaction(ctx.userId, payload.messageServerId);
  });

  registry.registerProcessor("message_read", async (op, ctx) => {
    const payload = op.payload as { lastReadMessageId?: number };
    if (!Number.isSafeInteger(payload.lastReadMessageId)) {
      throw new Error("Message read operation has no valid watermark.");
    }
    const response = await api.markMessagesRead(
      ctx.token,
      ctx.messId!,
      payload.lastReadMessageId,
    );
    await repository.acknowledgeRead(
      ctx.userId,
      ctx.messId!,
      response.unreadCount,
    );
    // The badge was cleared optimistically when the read was queued; this is
    // the first moment the server's own count can be trusted again.
    invalidateApiCache("/mess/messages/unread-count");
    emitMessageLifecycle({
      type: "read",
      messId: ctx.messId!,
      unreadCount: response.unreadCount,
    });
  });
  registry.registerPuller("messages", async (cursor, ctx) => {
    if (ctx.messId === null) return { cursor: null };
    const savedCursor = Number(cursor);
    const localCursor = await repository.highestServerId(
      ctx.userId,
      ctx.messId,
    );
    const hasSavedCursor =
      cursor !== null && Number.isSafeInteger(savedCursor) && savedCursor >= 0;
    // Once a durable cursor exists it is authoritative. A newer realtime row
    // in SQLite must not jump the cursor over messages missed while offline.
    const afterId = hasSavedCursor ? savedCursor : localCursor;
    if (afterId === 0) {
      const response = await api.getMessages(ctx.token, ctx.messId);
      await repository.merge(ctx.userId, response.messages as ApiMessage[]);
      const newest = response.messages.reduce(
        (maximum, message) => Math.max(maximum, message.id),
        0,
      );
      return { cursor: String(newest) };
    }
    const response = await api.getMessageChanges(
      ctx.token,
      ctx.messId,
      afterId,
    );
    await repository.merge(ctx.userId, response.messages);
    return { cursor: String(response.nextSyncCursor) };
  });
};
