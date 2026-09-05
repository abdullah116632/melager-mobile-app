import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { ApiMessage, ApiMessageCursor } from "@/lib/api";

import { OutboxRepository } from "../../repositories/outboxRepository";
import {
  emitMessageLifecycle,
  type MessageDeliveryState,
} from "./messageLifecycle";

export type MessageItem = Omit<ApiMessage, "id"> & {
  id: number | string;
  localId: string;
  serverId: number | null;
  status: MessageDeliveryState;
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
    await this.db.withTransactionAsync(async () => {
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
    return {
      messages,
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
    await this.db.withTransactionAsync(async () => {
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
    };
  }

  async markPending(localId: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE local_messages SET status='pending' WHERE local_id=?",
      localId,
    );
    emitMessageLifecycle({ type: "status", localId, status: "pending" });
  }

  async acknowledge(localId: string, message: ApiMessage): Promise<void> {
    await this.db.withTransactionAsync(async () => {
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
    await this.db.withTransactionAsync(async () => {
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
