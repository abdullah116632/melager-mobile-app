import type { SQLiteDatabase } from "expo-sqlite";

import type { ApiServerNotification } from "@/lib/api";
import { OutboxRepository } from "../../repositories/outboxRepository";

interface NotificationRow {
  server_id: number;
  mess_id: number;
  type: string;
  title: string;
  body: string;
  created_at: number;
  read_at: number | null;
}

const toTimestamp = (value: string | null): number | null => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const toApiNotification = (row: NotificationRow): ApiServerNotification => ({
  id: row.server_id,
  messId: row.mess_id,
  noticeId: null,
  type: row.type,
  title: row.title,
  body: row.body,
  readAt: row.read_at === null ? null : new Date(row.read_at).toISOString(),
  createdAt: new Date(row.created_at).toISOString(),
});

export class NotificationRepository {
  private readonly outbox: OutboxRepository;

  constructor(private readonly db: SQLiteDatabase) {
    this.outbox = new OutboxRepository(db);
  }

  async list(userId: number, messId: number): Promise<ApiServerNotification[]> {
    const rows = await this.db.getAllAsync<NotificationRow>(
      `SELECT server_id, mess_id, type, title, body, created_at, read_at
       FROM local_notifications
       WHERE user_id = ? AND mess_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      userId,
      messId,
    );
    return rows.map(toApiNotification);
  }

  async unreadCount(userId: number, messId: number): Promise<number> {
    const row = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM local_notifications
       WHERE user_id = ? AND mess_id = ? AND read_at IS NULL`,
      userId,
      messId,
    );
    return Number(row?.total ?? 0);
  }

  async merge(
    userId: number,
    messId: number,
    notifications: ApiServerNotification[],
  ): Promise<ApiServerNotification[]> {
    const relevant = notifications.filter(
      (notification) =>
        notification.messId === messId &&
        notification.type !== "message" &&
        notification.type !== "notice",
    );
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `DELETE FROM local_notifications
         WHERE user_id = ? AND mess_id = ? AND read_pending = 0`,
        userId,
        messId,
      );
      for (const notification of relevant) {
        await this.mergeOne(userId, notification);
      }
    });
    return this.list(userId, messId);
  }

  async mergeOne(
    userId: number,
    notification: ApiServerNotification,
  ): Promise<void> {
    if (notification.type === "message" || notification.type === "notice") {
      return;
    }
    const createdAt = toTimestamp(notification.createdAt) ?? Date.now();
    const readAt = toTimestamp(notification.readAt);
    await this.db.runAsync(
      `INSERT INTO local_notifications
         (user_id, mess_id, server_id, type, title, body, created_at,
          read_at, read_pending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(user_id, mess_id, server_id) DO UPDATE SET
         type = excluded.type,
         title = excluded.title,
         body = excluded.body,
         created_at = excluded.created_at,
         read_at = CASE
           WHEN local_notifications.read_pending = 1
             THEN local_notifications.read_at
           ELSE excluded.read_at
         END`,
      userId,
      notification.messId,
      notification.id,
      notification.type,
      notification.title,
      notification.body,
      createdAt,
      readAt,
    );
  }

  async markRead(userId: number, messId: number, serverId: number) {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `UPDATE local_notifications
         SET read_at = ?, read_pending = 1
         WHERE user_id = ? AND mess_id = ? AND server_id = ?`,
        Date.now(),
        userId,
        messId,
        serverId,
      );
      await this.enqueueRead(userId, messId, serverId);
    });
  }

  async markAllRead(userId: number, messId: number): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      const rows = await this.db.getAllAsync<{ server_id: number }>(
        `SELECT server_id FROM local_notifications
         WHERE user_id = ? AND mess_id = ? AND read_at IS NULL`,
        userId,
        messId,
      );
      if (rows.length === 0) return;
      await this.db.runAsync(
        `UPDATE local_notifications
         SET read_at = ?, read_pending = 1
         WHERE user_id = ? AND mess_id = ? AND read_at IS NULL`,
        Date.now(),
        userId,
        messId,
      );
      for (const row of rows) {
        await this.enqueueRead(userId, messId, row.server_id);
      }
    });
  }

  async acknowledge(userId: number, messId: number, serverId: number) {
    await this.db.runAsync(
      `UPDATE local_notifications SET read_pending = 0
       WHERE user_id = ? AND mess_id = ? AND server_id = ?`,
      userId,
      messId,
      serverId,
    );
  }

  private async enqueueRead(userId: number, messId: number, serverId: number) {
    await this.outbox.enqueue({
      userId,
      messId,
      entityType: "notification",
      entityId: String(serverId),
      operation: "update",
      dedupeKey: `notification:${serverId}`,
      payload: { serverId },
    });
  }
}
