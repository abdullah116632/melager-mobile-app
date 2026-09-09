import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type {
  ApiMessage,
  ApiMessageCursor,
  ApiMessageReaction,
  MessageReactionKind,
} from "@/lib/api";

import { OutboxRepository } from "../../repositories/outboxRepository";
import { runInTransaction } from "../../database/transaction";
import {
  emitMessageLifecycle,
  type MessageDeliveryState,
} from "./messageLifecycle";

export type MessageItem = Omit<ApiMessage, "id" | "reactions"> & {
  id: number | string;
  localId: string;
  serverId: number | null;
  status: MessageDeliveryState;
  reactions: ApiMessageReaction[];
};

export interface MessagePage {
  messages: MessageItem[];
  nextCursor: ApiMessageCursor | null;
}

const PAGE_SIZE = 30;

export class MessageRepository {
  private readonly outbox: OutboxRepository;

  constructor(private readonly db: SQLiteDatabase) {
    this.outbox = new OutboxRepository(db);
  }

  async merge(userId: number, messages: ApiMessage[]): Promise<void> {
    await runInTransaction(this.db, async () => {
      for (const message of messages) {
        const localId = message.clientMutationId ?? String(message.id);
        if (message.clientMutationId) {
          await this.db.runAsync(
            "DELETE FROM local_messages WHERE mess_id = ? AND server_id = ? AND local_id <> ?",
            message.messId,
            message.id,
            localId,
          );
          const reconciled = await this.db.runAsync(
            `UPDATE local_messages SET server_id=?,sender_name=?,body=?,created_at=?,updated_at=?,status='sent'
             WHERE local_id=?`,
            message.id,
            message.senderName,
            message.body,
            message.createdAt,
            message.updatedAt,
            localId,
          );
          if (reconciled.changes > 0) continue;
        }
        await this.db.runAsync(
          `INSERT INTO local_messages
            (local_id,server_id,user_id,mess_id,sender_user_id,sender_name,body,created_at,updated_at,status,server_cursor)
           VALUES(?,?,?,?,?,?,?,?,?,'sent',NULL)
           ON CONFLICT(mess_id,server_id) WHERE server_id IS NOT NULL DO UPDATE SET
             sender_name=excluded.sender_name,body=excluded.body,
             updated_at=excluded.updated_at,status='sent'`,
          localId,
          message.id,
          userId,
          message.messId,
          message.senderUserId,
          message.senderName,
          message.body,
          message.createdAt,
          message.updatedAt,
        );
      }
      for (const message of messages) {
        if (!message.reactions) continue;
        // The server list is authoritative for this message, but a reaction of
        // our own that has not synced yet must survive the replacement.
        await this.db.runAsync(
          "DELETE FROM local_message_reactions WHERE message_server_id=? AND is_dirty=0",
          message.id,
        );
        for (const reaction of message.reactions) {
          await this.db.runAsync(
            `INSERT INTO local_message_reactions
              (mess_id,message_server_id,user_id,reaction,updated_at,is_dirty)
             VALUES(?,?,?,?,?,0)
             ON CONFLICT(message_server_id,user_id) DO UPDATE SET
               reaction=excluded.reaction,updated_at=excluded.updated_at
             WHERE is_dirty=0`,
            message.messId,
            message.id,
            reaction.userId,
            reaction.reaction,
            Date.now(),
          );
        }
      }
      for (const messId of new Set(messages.map((message) => message.messId))) {
        const readState = await this.db.getFirstAsync<{
          last_read_server_id: number | null;
        }>(
          `SELECT last_read_server_id FROM local_message_read_state
           WHERE user_id=? AND mess_id=?`,
          userId,
          messId,
        );
        const watermark = Math.max(
          0,
          Number(readState?.last_read_server_id ?? 0),
        );
        const unread = await this.db.getFirstAsync<{ total: number }>(
          `SELECT COUNT(*) AS total FROM local_messages
           WHERE user_id=? AND mess_id=? AND server_id>? AND sender_user_id<>?`,
          userId,
          messId,
          watermark,
          userId,
        );
        await this.db.runAsync(
          `INSERT INTO local_message_read_state
            (user_id,mess_id,last_read_server_id,unread_count,read_pending)
           VALUES(?,?,?, ?,0) ON CONFLICT(user_id,mess_id) DO UPDATE SET
            unread_count=excluded.unread_count`,
          userId,
          messId,
          watermark,
          Math.max(0, Number(unread?.total ?? 0)),
        );
      }
    });
  }

  async listPage(
    userId: number,
    messId: number,
    cursor?: ApiMessageCursor,
  ): Promise<MessagePage> {
    const cursorSql = cursor
      ? "AND (created_at < ? OR (created_at = ? AND COALESCE(server_id, 0) < ?))"
      : "";
    const cursorArgs = cursor
      ? [cursor.createdAt, cursor.createdAt, cursor.id]
      : [];
    const rows = await this.db.getAllAsync<MessageItem>(
      `SELECT CASE WHEN server_id IS NULL THEN 'local:' || local_id ELSE server_id END AS id,
        local_id AS localId,server_id AS serverId,mess_id AS messId,
        sender_user_id AS senderUserId,sender_name AS senderName,body,
        created_at AS createdAt,updated_at AS updatedAt,status
       FROM local_messages WHERE user_id=? AND mess_id=? ${cursorSql}
       ORDER BY created_at DESC, COALESCE(server_id, 0) DESC LIMIT ?`,
      userId,
      messId,
      ...cursorArgs,
      PAGE_SIZE + 1,
    );
    const hasMore = rows.length > PAGE_SIZE;
    const messages = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    const last = messages.at(-1);
    const reactions = await this.reactionsFor(
      messages.flatMap((message) =>
        message.serverId === null ? [] : [message.serverId],
      ),
    );
    return {
      messages: messages.map((message) => ({
        ...message,
        reactions:
          message.serverId === null
            ? []
            : (reactions.get(message.serverId) ?? []),
      })),
      nextCursor:
        hasMore && last
          ? { createdAt: last.createdAt, id: last.serverId ?? 0 }
          : null,
    };
  }

  async highestServerId(userId: number, messId: number): Promise<number> {
    const row = await this.db.getFirstAsync<{ id: number | null }>(
      "SELECT MAX(server_id) AS id FROM local_messages WHERE user_id=? AND mess_id=?",
      userId,
      messId,
    );
    return Math.max(0, Number(row?.id ?? 0));
  }

  async getUnreadCount(userId: number, messId: number): Promise<number> {
    const row = await this.db.getFirstAsync<{ unread_count: number }>(
      "SELECT unread_count FROM local_message_read_state WHERE user_id=? AND mess_id=?",
      userId,
      messId,
    );
    return Math.max(0, Number(row?.unread_count ?? 0));
  }

  async compose(
    userId: number,
    messId: number,
    senderUserId: number,
    body: string,
  ): Promise<MessageItem> {
    const localId = Crypto.randomUUID();
    const now = new Date().toISOString();
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        `INSERT INTO local_messages
          (local_id,server_id,user_id,mess_id,sender_user_id,sender_name,body,created_at,updated_at,status,server_cursor)
         VALUES(?,NULL,?,?,?,?,?,?,?,'pending',NULL)`,
        localId,
        userId,
        messId,
        senderUserId,
        "You",
        body,
        now,
        now,
      );
      await this.outbox.enqueue({
        id: localId,
        userId,
        messId,
        entityType: "message",
        entityId: localId,
        operation: "create",
        payload: { localId, body },
      });
    });
    return {
      id: `local:${localId}`,
      localId,
      serverId: null,
      messId,
      senderUserId,
      senderName: "You",
      body,
      createdAt: now,
      updatedAt: now,
      status: "pending",
      reactions: [],
    };
  }

  private async reactionsFor(
    messageServerIds: number[],
  ): Promise<Map<number, ApiMessageReaction[]>> {
    const grouped = new Map<number, ApiMessageReaction[]>();
    if (messageServerIds.length === 0) return grouped;
    const placeholders = messageServerIds.map(() => "?").join(",");
    const rows = await this.db.getAllAsync<{
      message_server_id: number;
      user_id: number;
      reaction: MessageReactionKind;
    }>(
      `SELECT message_server_id,user_id,reaction FROM local_message_reactions
       WHERE message_server_id IN (${placeholders})`,
      ...messageServerIds,
    );
    for (const row of rows) {
      const entry = { userId: row.user_id, reaction: row.reaction };
      const existing = grouped.get(row.message_server_id);
      if (existing) existing.push(entry);
      else grouped.set(row.message_server_id, [entry]);
    }
    return grouped;
  }

  /**
   * Applies the caller's reaction locally and queues it. `reaction` of null
   * removes it. The row stays dirty until the server confirms so a refresh
   * cannot wipe a choice that has not synced yet.
   */
  async setReaction(
    userId: number,
    messId: number,
    messageServerId: number,
    reaction: MessageReactionKind | null,
  ): Promise<void> {
    await runInTransaction(this.db, async () => {
      if (reaction === null) {
        await this.db.runAsync(
          "DELETE FROM local_message_reactions WHERE message_server_id=? AND user_id=?",
          messageServerId,
          userId,
        );
      } else {
        await this.db.runAsync(
          `INSERT INTO local_message_reactions
            (mess_id,message_server_id,user_id,reaction,updated_at,is_dirty)
           VALUES(?,?,?,?,?,1)
           ON CONFLICT(message_server_id,user_id) DO UPDATE SET
             reaction=excluded.reaction,updated_at=excluded.updated_at,is_dirty=1`,
          messId,
          messageServerId,
          userId,
          reaction,
          Date.now(),
        );
      }
      await this.outbox.enqueue({
        userId,
        messId,
        entityType: "message_reaction",
        entityId: String(messageServerId),
        operation: "upsert",
        // One pending choice per message: a later change replaces the queued one.
        dedupeKey: `message-reaction:${messageServerId}`,
        payload: { messageServerId, reaction },
      });
    });
  }

  /** Clears the dirty flag once the server has stored the caller's choice. */
  async acknowledgeReaction(
    userId: number,
    messageServerId: number,
  ): Promise<void> {
    await this.db.runAsync(
      "UPDATE local_message_reactions SET is_dirty=0 WHERE message_server_id=? AND user_id=?",
      messageServerId,
      userId,
    );
  }

  /** Applies a reaction change coming from another device over realtime. */
  async applyRemoteReaction(
    messId: number,
    messageServerId: number,
    userId: number,
    reaction: MessageReactionKind | null,
  ): Promise<void> {
    if (reaction === null) {
      await this.db.runAsync(
        "DELETE FROM local_message_reactions WHERE message_server_id=? AND user_id=? AND is_dirty=0",
        messageServerId,
        userId,
      );
      return;
    }
    await this.db.runAsync(
      `INSERT INTO local_message_reactions
        (mess_id,message_server_id,user_id,reaction,updated_at,is_dirty)
       VALUES(?,?,?,?,?,0)
       ON CONFLICT(message_server_id,user_id) DO UPDATE SET
         reaction=excluded.reaction,updated_at=excluded.updated_at
       WHERE is_dirty=0`,
      messId,
      messageServerId,
      userId,
      reaction,
      Date.now(),
    );
  }

  async markPending(localId: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE local_messages SET status='pending' WHERE local_id=?",
      localId,
    );
    emitMessageLifecycle({ type: "status", localId, status: "pending" });
  }

  async acknowledge(localId: string, message: ApiMessage): Promise<void> {
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        "DELETE FROM local_messages WHERE mess_id=? AND server_id=? AND local_id<>?",
        message.messId,
        message.id,
        localId,
      );
      await this.db.runAsync(
        `UPDATE local_messages SET server_id=?,sender_name=?,body=?,created_at=?,updated_at=?,status='sent'
         WHERE local_id=?`,
        message.id,
        message.senderName,
        message.body,
        message.createdAt,
        message.updatedAt,
        localId,
      );
    });
    emitMessageLifecycle({ type: "acknowledged", localId, message });
  }

  async failed(localId: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE local_messages SET status='failed' WHERE local_id=?",
      localId,
    );
    emitMessageLifecycle({ type: "status", localId, status: "failed" });
  }

  async markRead(userId: number, messId: number): Promise<number> {
    const lastReadServerId = await this.highestServerId(userId, messId);
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        `INSERT INTO local_message_read_state
          (user_id,mess_id,last_read_server_id,unread_count,read_pending)
         VALUES(?,?,?,0,1) ON CONFLICT(user_id,mess_id) DO UPDATE SET
          last_read_server_id=MAX(COALESCE(last_read_server_id,0),excluded.last_read_server_id),
          unread_count=0,read_pending=1`,
        userId,
        messId,
        lastReadServerId,
      );
      await this.outbox.enqueue({
        userId,
        messId,
        entityType: "message_read",
        entityId: String(messId),
        operation: "command",
        dedupeKey: `message-read:${messId}`,
        payload: { lastReadMessageId: lastReadServerId },
      });
    });
    return lastReadServerId;
  }

  async acknowledgeRead(
    userId: number,
    messId: number,
    unreadCount: number,
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_message_read_state
       SET unread_count=?,read_pending=0 WHERE user_id=? AND mess_id=?`,
      Math.max(0, unreadCount),
      userId,
      messId,
    );
  }
}
