import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { ApiNotice } from "@/lib/api";

import { OutboxRepository } from "../../repositories/outboxRepository";
import type { NoticeMutationPayload, NoticesSnapshot } from "./types";

interface NoticeRow {
  local_id: string;
  server_id: number | null;
  display_id: number;
  mess_id: number;
  serial_no: number;
  title: string;
  body: string;
  color: string;
  created_by_user_id: number;
  created_at: string;
  server_updated_at: string | null;
  local_updated_at: number;
  is_dirty: number;
  is_deleted: number;
}

const collection = "notices";
const scopeKey = (userId: number, messId: number) =>
  `${userId}:${messId}:${collection}`;
const tempId = () =>
  -Math.min(
    Number.MAX_SAFE_INTEGER,
    Date.now() * 1000 + Math.floor(Math.random() * 1000),
  );

const toNotice = (row: NoticeRow): ApiNotice => ({
  id: row.display_id,
  messId: row.mess_id,
  serialNo: row.serial_no,
  title: row.title,
  body: row.body,
  color: row.color,
  createdByUserId: row.created_by_user_id,
  createdAt: row.created_at,
  updatedAt:
    row.server_updated_at ?? new Date(row.local_updated_at).toISOString(),
});

export class NoticeRepository {
  private readonly outbox: OutboxRepository;

  constructor(private readonly database: SQLiteDatabase) {
    this.outbox = new OutboxRepository(database);
  }

  async getSnapshot(
    userId: number,
    messId: number,
  ): Promise<NoticesSnapshot | null> {
    const state = await this.database.getFirstAsync<{
      last_synced_at: number | null;
    }>(
      "SELECT last_synced_at FROM sync_state WHERE scope_key = ?",
      scopeKey(userId, messId),
    );
    if (!state) return null;
    const [rows, readState, pending] = await Promise.all([
      this.database.getAllAsync<NoticeRow>(
        `SELECT * FROM local_notices
         WHERE mess_id = ? AND is_deleted = 0
         ORDER BY serial_no ASC, created_at ASC, display_id ASC`,
        messId,
      ),
      this.database.getFirstAsync<{ unread_count: number }>(
        `SELECT unread_count FROM local_notice_read_state
         WHERE user_id = ? AND mess_id = ?`,
        userId,
        messId,
      ),
      this.database.getFirstAsync<{ total: number }>(
        `SELECT COUNT(*) AS total FROM offline_outbox
         WHERE user_id = ? AND mess_id = ?
           AND entity_type IN ('notice', 'notice_reorder', 'notice_notification')`,
        userId,
        messId,
      ),
    ]);
    return {
      notices: rows.map(toNotice),
      unreadCount: Math.max(0, Number(readState?.unread_count ?? 0)),
      pendingCount: Number(pending?.total ?? 0),
      savedAt: Number(state.last_synced_at ?? 0),
    };
  }

  async getUnreadCount(userId: number, messId: number): Promise<number> {
    const row = await this.database.getFirstAsync<{ unread_count: number }>(
      `SELECT unread_count FROM local_notice_read_state
       WHERE user_id = ? AND mess_id = ?`,
      userId,
      messId,
    );
    return Math.max(0, Number(row?.unread_count ?? 0));
  }

  async replaceRemoteUnreadCount(
    userId: number,
    messId: number,
    unreadCount: number,
  ): Promise<number> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      const local = await this.database.getFirstAsync<{ read_pending: number }>(
        `SELECT read_pending FROM local_notice_read_state
         WHERE user_id = ? AND mess_id = ?`,
        userId,
        messId,
      );
      if (local?.read_pending !== 1) {
        await this.database.runAsync(
          `INSERT INTO local_notice_read_state
            (user_id, mess_id, unread_count, read_pending, updated_at)
           VALUES (?, ?, ?, 0, ?)
           ON CONFLICT(user_id, mess_id) DO UPDATE SET
             unread_count = excluded.unread_count, updated_at = excluded.updated_at`,
          userId,
          messId,
          Math.max(0, unreadCount),
          now,
        );
      }
      await this.ensureSyncState(userId, messId, now);
    });
    return this.getUnreadCount(userId, messId);
  }

  async replaceRemoteSnapshot(
    userId: number,
    messId: number,
    notices: ApiNotice[],
    unreadCount: number,
  ): Promise<void> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      const localRows = await this.database.getAllAsync<NoticeRow>(
        "SELECT * FROM local_notices WHERE mess_id = ?",
        messId,
      );
      const dirtyServerIds = new Set(
        localRows.flatMap((row) =>
          row.is_dirty === 1 && row.server_id !== null ? [row.server_id] : [],
        ),
      );
      const remoteIds = new Set(notices.map((notice) => notice.id));
      const reorderPending = await this.hasPendingReorder(userId, messId);
      const localOrderingProtected =
        reorderPending || localRows.some((row) => row.is_dirty === 1);
      for (const [index, notice] of notices.entries()) {
        if (dirtyServerIds.has(notice.id)) continue;
        await this.upsertServerNotice(
          messId,
          notice,
          localOrderingProtected ? localRows.length + index + 1 : index + 1,
          now,
        );
      }
      for (const row of localRows) {
        if (
          row.is_dirty === 0 &&
          row.server_id !== null &&
          !remoteIds.has(row.server_id)
        ) {
          await this.database.runAsync(
            "DELETE FROM local_notices WHERE local_id = ?",
            row.local_id,
          );
        }
      }
      if (localOrderingProtected) {
        const refreshed = await this.database.getAllAsync<NoticeRow>(
          "SELECT * FROM local_notices WHERE mess_id = ? AND is_deleted = 0 ORDER BY serial_no ASC, created_at ASC, display_id ASC",
          messId,
        );
        for (const [index, row] of refreshed.entries()) {
          await this.database.runAsync(
            "UPDATE local_notices SET serial_no = ? WHERE local_id = ?",
            index + 1,
            row.local_id,
          );
        }
      }
      const readState = await this.database.getFirstAsync<{
        read_pending: number;
      }>(
        `SELECT read_pending FROM local_notice_read_state
         WHERE user_id = ? AND mess_id = ?`,
        userId,
        messId,
      );
      if (readState?.read_pending !== 1) {
        await this.database.runAsync(
          `INSERT INTO local_notice_read_state
            (user_id, mess_id, unread_count, read_pending, updated_at)
           VALUES (?, ?, ?, 0, ?)
           ON CONFLICT(user_id, mess_id) DO UPDATE SET
             unread_count = excluded.unread_count, updated_at = excluded.updated_at`,
          userId,
          messId,
          Math.max(0, unreadCount),
          now,
        );
      }
      await this.saveSyncState(userId, messId, now);
    });
  }

  async create(
    userId: number,
    messId: number,
    input: { title: string; body: string; color: string },
  ): Promise<void> {
    const localId = Crypto.randomUUID();
    const displayId = tempId();
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        "UPDATE local_notices SET serial_no = serial_no + 1 WHERE mess_id = ? AND is_deleted = 0",
        messId,
      );
      await this.database.runAsync(
        `INSERT INTO local_notices
          (local_id, server_id, display_id, mess_id, serial_no, title, body, color,
           created_by_user_id, created_at, server_updated_at, local_updated_at, is_dirty, is_deleted)
         VALUES (?, NULL, ?, ?, 1, ?, ?, ?, ?, ?, NULL, ?, 1, 0)`,
        localId,
        displayId,
        messId,
        input.title,
        input.body,
        input.color,
        userId,
        createdAt,
        now,
      );
      await this.outbox.enqueue<NoticeMutationPayload>({
        dedupeKey: `notice:create:${localId}`,
        userId,
        messId,
        entityType: "notice",
        entityId: localId,
        operation: "create",
        payload: { localId, ...input },
      });
      await this.ensureSyncState(userId, messId, now);
    });
  }

  async update(
    userId: number,
    messId: number,
    displayId: number,
    input: { title: string; body: string; color: string },
  ): Promise<void> {
    const row = await this.require(messId, displayId);
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        "UPDATE local_notices SET title = ?, body = ?, color = ?, local_updated_at = ?, is_dirty = 1 WHERE local_id = ?",
        input.title,
        input.body,
        input.color,
        now,
        row.local_id,
      );
      if (row.server_id === null) {
        await this.outbox.enqueue<NoticeMutationPayload>({
          dedupeKey: `notice:create:${row.local_id}`,
          userId,
          messId,
          entityType: "notice",
          entityId: row.local_id,
          operation: "create",
          payload: { localId: row.local_id, ...input },
        });
      } else {
        await this.outbox.enqueue<NoticeMutationPayload>({
          dedupeKey: `notice:update:${row.local_id}`,
          userId,
          messId,
          entityType: "notice",
          entityId: row.local_id,
          operation: "update",
          payload: { localId: row.local_id, serverId: row.server_id, ...input },
        });
      }
      await this.ensureSyncState(userId, messId, now);
    });
  }

  async remove(
    userId: number,
    messId: number,
    displayId: number,
  ): Promise<void> {
    const row = await this.require(messId, displayId);
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      if (row.server_id === null) {
        await this.database.runAsync(
          "DELETE FROM local_notices WHERE local_id = ?",
          row.local_id,
        );
        await this.database.runAsync(
          "DELETE FROM offline_outbox WHERE user_id = ? AND entity_id = ?",
          userId,
          row.local_id,
        );
      } else {
        await this.database.runAsync(
          "UPDATE local_notices SET is_deleted = 1, is_dirty = 1, local_updated_at = ? WHERE local_id = ?",
          now,
          row.local_id,
        );
        await this.database.runAsync(
          "DELETE FROM offline_outbox WHERE user_id = ? AND entity_id = ? AND entity_type = 'notice'",
          userId,
          row.local_id,
        );
        await this.outbox.enqueue<NoticeMutationPayload>({
          dedupeKey: `notice:delete:${row.local_id}`,
          userId,
          messId,
          entityType: "notice",
          entityId: row.local_id,
          operation: "delete",
          payload: { localId: row.local_id, serverId: row.server_id },
        });
      }
      await this.queueReorderAfterDelete(userId, messId);
      await this.ensureSyncState(userId, messId, now);
    });
  }

  async reorder(
    userId: number,
    messId: number,
    notices: ApiNotice[],
  ): Promise<void> {
    const now = Date.now();
    const localRows = await Promise.all(
      notices.map((notice) =>
        this.database.getFirstAsync<{ local_id: string }>(
          "SELECT local_id FROM local_notices WHERE mess_id = ? AND display_id = ?",
          messId,
          notice.id,
        ),
      ),
    );
    const localIds = localRows.flatMap((row) => (row ? [row.local_id] : []));
    if (localIds.length !== notices.length)
      throw new Error("Notice order contains an unknown notice.");
    await this.database.withTransactionAsync(async () => {
      for (const [index, notice] of notices.entries()) {
        await this.database.runAsync(
          "UPDATE local_notices SET serial_no = ?, local_updated_at = ?, is_dirty = 1 WHERE mess_id = ? AND display_id = ?",
          index + 1,
          now,
          messId,
          notice.id,
        );
      }
      await this.outbox.enqueue<NoticeMutationPayload>({
        dedupeKey: `notice:reorder:${messId}`,
        userId,
        messId,
        entityType: "notice_reorder",
        entityId: "order",
        operation: "upsert",
        payload: { localIds },
      });
      await this.ensureSyncState(userId, messId, now);
    });
  }

  async markRead(userId: number, messId: number): Promise<void> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO local_notice_read_state
          (user_id, mess_id, unread_count, read_pending, updated_at)
         VALUES (?, ?, 0, 1, ?)
         ON CONFLICT(user_id, mess_id) DO UPDATE SET
           unread_count = 0, read_pending = 1, updated_at = excluded.updated_at`,
        userId,
        messId,
        now,
      );
      await this.outbox.enqueue<NoticeMutationPayload>({
        dedupeKey: `notice:read:${userId}:${messId}`,
        userId,
        messId,
        entityType: "notice_notification",
        entityId: "read",
        operation: "command",
        payload: {},
      });
      await this.ensureSyncState(userId, messId, now);
    });
  }

  async acknowledge(
    localId: string,
    notice: ApiNotice,
    operationId: string,
  ): Promise<void> {
    const other = await this.database.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM offline_outbox
       WHERE entity_type = 'notice' AND entity_id = ? AND id <> ?`,
      localId,
      operationId,
    );
    if (Number(other?.total ?? 0) > 0) {
      await this.database.runAsync(
        "UPDATE local_notices SET server_id = ?, display_id = ?, server_updated_at = ? WHERE local_id = ?",
        notice.id,
        notice.id,
        notice.updatedAt,
        localId,
      );
      return;
    }
    await this.database.runAsync(
      `UPDATE local_notices SET server_id = ?, display_id = ?, serial_no = ?, title = ?, body = ?, color = ?,
        created_by_user_id = ?, created_at = ?, server_updated_at = ?, local_updated_at = ?, is_dirty = 0, is_deleted = 0
       WHERE local_id = ?`,
      notice.id,
      notice.id,
      notice.serialNo,
      notice.title,
      notice.body,
      notice.color,
      notice.createdByUserId,
      notice.createdAt,
      notice.updatedAt,
      Date.now(),
      localId,
    );
  }

  async acknowledgeDelete(localId: string): Promise<void> {
    await this.database.runAsync(
      "DELETE FROM local_notices WHERE local_id = ?",
      localId,
    );
  }

  async discardReorder(operationId: string, messId: number): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        "DELETE FROM offline_outbox WHERE id = ?",
        operationId,
      );
      await this.database.runAsync(
        `UPDATE local_notices SET is_dirty = 0
         WHERE mess_id = ? AND is_deleted = 0
           AND NOT EXISTS (
             SELECT 1 FROM offline_outbox
             WHERE offline_outbox.entity_type = 'notice'
               AND offline_outbox.entity_id = local_notices.local_id
           )`,
        messId,
      );
    });
  }

  async acknowledgeReorder(
    messId: number,
    notices: ApiNotice[],
  ): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      for (const [index, notice] of notices.entries()) {
        await this.database.runAsync(
          `UPDATE local_notices SET server_id = ?, display_id = ?, serial_no = ?, title = ?, body = ?, color = ?,
            server_updated_at = ?, local_updated_at = ?, is_dirty = 0
           WHERE mess_id = ? AND display_id = ?`,
          notice.id,
          notice.id,
          index + 1,
          notice.title,
          notice.body,
          notice.color,
          notice.updatedAt,
          Date.now(),
          messId,
          notice.id,
        );
      }
      const rows = await this.database.getAllAsync<NoticeRow>(
        "SELECT * FROM local_notices WHERE mess_id = ? AND is_deleted = 0 ORDER BY serial_no ASC",
        messId,
      );
      for (const [index, row] of rows.entries()) {
        await this.database.runAsync(
          "UPDATE local_notices SET serial_no = ?, is_dirty = 0 WHERE local_id = ? AND is_dirty = 0",
          index + 1,
          row.local_id,
        );
      }
    });
  }

  async acknowledgeRead(userId: number, messId: number): Promise<void> {
    await this.database.runAsync(
      "UPDATE local_notice_read_state SET unread_count = 0, read_pending = 0, updated_at = ? WHERE user_id = ? AND mess_id = ?",
      Date.now(),
      userId,
      messId,
    );
  }

  async getByLocalId(localId: string): Promise<NoticeRow | null> {
    return this.database.getFirstAsync<NoticeRow>(
      "SELECT * FROM local_notices WHERE local_id = ?",
      localId,
    );
  }

  private async require(messId: number, displayId: number): Promise<NoticeRow> {
    const row = await this.database.getFirstAsync<NoticeRow>(
      "SELECT * FROM local_notices WHERE mess_id = ? AND display_id = ? AND is_deleted = 0",
      messId,
      displayId,
    );
    if (!row) throw new Error("Notice not found.");
    return row;
  }

  private async hasPendingReorder(
    userId: number,
    messId: number,
  ): Promise<boolean> {
    const row = await this.database.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM offline_outbox
       WHERE user_id = ? AND mess_id = ? AND entity_type = 'notice_reorder'`,
      userId,
      messId,
    );
    return Number(row?.total ?? 0) > 0;
  }

  private async queueReorderAfterDelete(
    userId: number,
    messId: number,
  ): Promise<void> {
    await this.database.runAsync(
      "DELETE FROM offline_outbox WHERE user_id = ? AND mess_id = ? AND entity_type = 'notice_reorder'",
      userId,
      messId,
    );
    const rows = await this.database.getAllAsync<NoticeRow>(
      `SELECT * FROM local_notices
       WHERE mess_id = ? AND is_deleted = 0
       ORDER BY serial_no ASC, created_at ASC, display_id ASC`,
      messId,
    );
    if (rows.length === 0) return;
    await this.outbox.enqueue<NoticeMutationPayload>({
      dedupeKey: `notice:reorder:${messId}`,
      userId,
      messId,
      entityType: "notice_reorder",
      entityId: "order",
      operation: "upsert",
      payload: { localIds: rows.map((row) => row.local_id) },
    });
  }

  private async upsertServerNotice(
    messId: number,
    notice: ApiNotice,
    serialNo: number,
    now: number,
  ): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO local_notices
        (local_id, server_id, display_id, mess_id, serial_no, title, body, color, created_by_user_id,
         created_at, server_updated_at, local_updated_at, is_dirty, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
       ON CONFLICT(mess_id, server_id) WHERE server_id IS NOT NULL DO UPDATE SET
         display_id = excluded.display_id, serial_no = excluded.serial_no, title = excluded.title,
         body = excluded.body, color = excluded.color, created_by_user_id = excluded.created_by_user_id,
         created_at = excluded.created_at, server_updated_at = excluded.server_updated_at,
         local_updated_at = excluded.local_updated_at, is_dirty = 0, is_deleted = 0`,
      `server:${notice.id}`,
      notice.id,
      notice.id,
      messId,
      serialNo,
      notice.title,
      notice.body,
      notice.color,
      notice.createdByUserId,
      notice.createdAt,
      notice.updatedAt,
      now,
    );
  }

  private async saveSyncState(
    userId: number,
    messId: number,
    now: number,
  ): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO sync_state (scope_key, user_id, mess_id, collection, cursor, last_synced_at, last_error, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, NULL, ?)
       ON CONFLICT(scope_key) DO UPDATE SET last_synced_at = excluded.last_synced_at, last_error = NULL, updated_at = excluded.updated_at`,
      scopeKey(userId, messId),
      userId,
      messId,
      collection,
      now,
      now,
    );
  }

  private async ensureSyncState(
    userId: number,
    messId: number,
    now: number,
  ): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO sync_state (scope_key, user_id, mess_id, collection, cursor, last_synced_at, last_error, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)
       ON CONFLICT(scope_key) DO UPDATE SET updated_at = excluded.updated_at`,
      scopeKey(userId, messId),
      userId,
      messId,
      collection,
      now,
    );
  }
}
