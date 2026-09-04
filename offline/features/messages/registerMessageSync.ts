import type { SQLiteDatabase } from "expo-sqlite";
import { api, type ApiMessage } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { MessageRepository } from "./MessageRepository";
export const registerMessageSync = (
  registry: SyncRegistry,
  database: SQLiteDatabase,
) => {
  const repository = new MessageRepository(database);
  registry.registerProcessor("message", async (op, ctx) => {
    const p = op.payload as { localId: string; body: string };
    try {
      const r = await api.syncMessage(op.id, ctx.messId!, p.body, ctx.token);
      await repository.acknowledge(p.localId, r.message);
    } catch (e) {
      await repository.failed(p.localId);
      throw e;
    }
  });
  registry.registerProcessor("message_read", async (_op, ctx) => {
    await api.markMessagesRead(ctx.token, ctx.messId!);
  });
  registry.registerPuller("messages", async (_c, ctx) => {
    if (ctx.messId === null) return { cursor: null };
    const r = await api.getMessages(ctx.token, ctx.messId);
    await repository.merge(ctx.userId, r.messages as ApiMessage[]);
    return { cursor: r.nextCursor ? JSON.stringify(r.nextCursor) : null };
  });
};
