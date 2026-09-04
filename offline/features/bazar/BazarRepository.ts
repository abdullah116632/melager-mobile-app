import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { ApiBazarAssignment, ApiBazarItem } from "@/lib/api";

import { OutboxRepository } from "../../repositories/outboxRepository";
import type {
  BazarMutationPayload,
  BazarSnapshot,
  DesiredAssignmentInput,
} from "./types";

interface ItemRow {
  local_id: string;
  server_id: number | null;
  display_id: number;
  mess_id: number;
  weekday: number;
  name: string;
  price: number;
  is_completed: number;
  created_by_user_id: number;
  created_at: string;
  server_updated_at: string | null;
  local_updated_at: number;
  is_dirty: number;
  is_deleted: number;
}

interface AssignmentRow {
  local_id: string;
  server_id: number | null;
  display_id: number;
  weekday: number;
  consumer_id: number;
  name: string | null;
  email: string | null;
  is_dirty: number;
}

const collection = "bazar";
const scopeKey = (userId: number, messId: number) =>
  `${userId}:${messId}:${collection}`;
const tempId = () =>
  -Math.min(
    Number.MAX_SAFE_INTEGER,
    Date.now() * 1000 + Math.floor(Math.random() * 1000),
  );

const toItem = (row: ItemRow): ApiBazarItem => ({
  id: row.display_id,
  messId: row.mess_id,
  weekday: row.weekday,
  name: row.name,
  price: Number(row.price),
  isCompleted: row.is_completed === 1,
  createdByUserId: row.created_by_user_id,
  createdAt: row.created_at,
  updatedAt:
    row.server_updated_at ?? new Date(row.local_updated_at).toISOString(),
});

const toAssignment = (row: AssignmentRow): ApiBazarAssignment => ({
  id: row.display_id,
  weekday: row.weekday,
  consumerId: row.consumer_id,
  name: row.name,
  email: row.email,
});

export class BazarRepository {
  private readonly outbox: OutboxRepository;

  constructor(private readonly database: SQLiteDatabase) {
    this.outbox = new OutboxRepository(database);
  }

  async getSnapshot(
    userId: number,
    messId: number,
  ): Promise<BazarSnapshot | null> {
    const state = await this.database.getFirstAsync<{
      last_synced_at: number | null;
    }>(
      "SELECT last_synced_at FROM sync_state WHERE scope_key = ?",
      scopeKey(userId, messId),
    );
    if (!state) return null;
    const [items, assignments, notification, pending] = await Promise.all([
      this.database.getAllAsync<ItemRow>(
        `SELECT * FROM local_bazar_items
         WHERE mess_id = ? AND is_deleted = 0
         ORDER BY weekday ASC, created_at DESC, display_id DESC`,
        messId,
      ),
      this.database.getAllAsync<AssignmentRow>(
        `SELECT * FROM local_bazar_assignments
         WHERE mess_id = ?
         ORDER BY weekday ASC, display_id ASC`,
        messId,
      ),
      this.database.getFirstAsync<{ unread_count: number }>(
        `SELECT unread_count FROM local_bazar_notification_state
         WHERE user_id = ? AND mess_id = ?`,
        userId,
        messId,
      ),
      this.database.getFirstAsync<{ total: number }>(
        `SELECT COUNT(*) AS total FROM offline_outbox
         WHERE user_id = ? AND mess_id = ?
           AND entity_type IN ('bazar_item', 'bazar_assignments', 'bazar_notification')`,
        userId,
        messId,
      ),
    ]);
    return {
      items: items.map(toItem),
      assignments: assignments.map(toAssignment),
      unreadCount: Number(notification?.unread_count ?? 0),
      pendingCount: Number(pending?.total ?? 0),
      savedAt: Number(state.last_synced_at ?? 0),
    };
  }

  async replaceRemoteSnapshot(
    userId: number,
    messId: number,
    items: ApiBazarItem[],
    assignments: ApiBazarAssignment[],
    unreadCount: number,
  ): Promise<void> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      const localItems = await this.database.getAllAsync<ItemRow>(
        "SELECT * FROM local_bazar_items WHERE mess_id = ?",
        messId,
      );
      const dirtyItemServerIds = new Set(
        localItems.flatMap((row) =>
          row.is_dirty === 1 && row.server_id !== null ? [row.server_id] : [],
        ),
      );
      const remoteItemIds = new Set(items.map((item) => item.id));
      for (const item of items) {
        if (dirtyItemServerIds.has(item.id)) continue;
        await this.upsertServerItem(messId, item, now);
      }
      for (const row of localItems) {
        if (
          row.is_dirty === 0 &&
          row.server_id !== null &&
          !remoteItemIds.has(row.server_id)
        ) {
          await this.database.runAsync(
            "DELETE FROM local_bazar_items WHERE local_id = ?",
            row.local_id,
          );
        }
      }

      const localAssignments = await this.database.getAllAsync<AssignmentRow>(
        "SELECT * FROM local_bazar_assignments WHERE mess_id = ?",
        messId,
      );
      const dirtyDays = new Set(
        localAssignments.flatMap((row) =>
          row.is_dirty === 1 ? [row.weekday] : [],
        ),
      );
      const pendingAssignmentDays = await this.database.getAllAsync<{
        weekday: number;
      }>(
        `SELECT CAST(entity_id AS INTEGER) AS weekday
         FROM offline_outbox
         WHERE user_id = ? AND mess_id = ?
           AND entity_type = 'bazar_assignments'`,
        userId,
        messId,
      );
      for (const row of pendingAssignmentDays) dirtyDays.add(row.weekday);
      const cleanRemoteAssignments = assignments.filter(
        (assignment) => !dirtyDays.has(assignment.weekday),
      );
      for (let weekday = 0; weekday <= 6; weekday += 1) {
        if (dirtyDays.has(weekday)) continue;
        await this.database.runAsync(
          "DELETE FROM local_bazar_assignments WHERE mess_id = ? AND weekday = ?",
          messId,
          weekday,
        );
      }
      for (const assignment of cleanRemoteAssignments) {
        await this.insertServerAssignment(messId, assignment, now);
      }

      const notification = await this.database.getFirstAsync<{
        read_pending: number;
      }>(
        `SELECT read_pending FROM local_bazar_notification_state
         WHERE user_id = ? AND mess_id = ?`,
        userId,
        messId,
      );
      if (notification?.read_pending !== 1) {
        await this.database.runAsync(
          `INSERT INTO local_bazar_notification_state (
            user_id, mess_id, unread_count, read_pending, updated_at
          ) VALUES (?, ?, ?, 0, ?)
          ON CONFLICT(user_id, mess_id) DO UPDATE SET
            unread_count = excluded.unread_count,
            updated_at = excluded.updated_at`,
          userId,
          messId,
          Math.max(0, unreadCount),
          now,
        );
      }
      await this.saveSyncState(userId, messId, now);
    });
  }

  async getUnreadCount(userId: number, messId: number): Promise<number> {
    const row = await this.database.getFirstAsync<{ unread_count: number }>(
      `SELECT unread_count FROM local_bazar_notification_state
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
      const local = await this.database.getFirstAsync<{
        read_pending: number;
      }>(
        `SELECT read_pending FROM local_bazar_notification_state
         WHERE user_id = ? AND mess_id = ?`,
        userId,
        messId,
      );
      if (local?.read_pending !== 1) {
        await this.database.runAsync(
          `INSERT INTO local_bazar_notification_state (
            user_id, mess_id, unread_count, read_pending, updated_at
          ) VALUES (?, ?, ?, 0, ?)
          ON CONFLICT(user_id, mess_id) DO UPDATE SET
            unread_count = excluded.unread_count,
            updated_at = excluded.updated_at`,
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

  async createItem(
    userId: number,
    messId: number,
    input: { weekday: number; name: string; price: number },
  ): Promise<ApiBazarItem> {
    const localId = Crypto.randomUUID();
    const displayId = tempId();
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO local_bazar_items (
          local_id, server_id, display_id, mess_id, weekday, name, price,
          is_completed, created_by_user_id, created_at, server_updated_at,
          local_updated_at, is_dirty, is_deleted
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, 1, 0)`,
        localId,
        displayId,
        messId,
        input.weekday,
        input.name,
        input.price,
        userId,
        createdAt,
        now,
      );
      await this.enqueueItemCreate(userId, messId, localId, input);
      await this.ensureSyncState(userId, messId, now);
    });
    return {
      id: displayId,
      messId,
      weekday: input.weekday,
      name: input.name,
      price: input.price,
      isCompleted: false,
      createdByUserId: userId,
      createdAt,
      updatedAt: createdAt,
    };
  }

  async updateItem(
    userId: number,
    messId: number,
    displayId: number,
    input: { name: string; price: number },
  ): Promise<ApiBazarItem> {
    const row = await this.requireItem(messId, displayId);
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `UPDATE local_bazar_items
         SET name = ?, price = ?, local_updated_at = ?, is_dirty = 1
         WHERE local_id = ?`,
        input.name,
        input.price,
        now,
        row.local_id,
      );
      if (row.server_id === null) {
        await this.enqueueItemCreate(userId, messId, row.local_id, {
          weekday: row.weekday,
          name: input.name,
          price: input.price,
          completed: row.is_completed === 1,
        });
      } else {
        await this.outbox.enqueue<BazarMutationPayload>({
          dedupeKey: `bazar:item:update:${row.local_id}`,
          userId,
          messId,
          entityType: "bazar_item",
          entityId: row.local_id,
          operation: "update",
          payload: { localId: row.local_id, serverId: row.server_id, ...input },
        });
      }
      await this.ensureSyncState(userId, messId, now);
    });
    return toItem({ ...row, ...input, local_updated_at: now, is_dirty: 1 });
  }

  async updateItemStatus(
    userId: number,
    messId: number,
    displayId: number,
    completed: boolean,
  ): Promise<ApiBazarItem> {
    const row = await this.requireItem(messId, displayId);
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `UPDATE local_bazar_items
         SET is_completed = ?, local_updated_at = ?, is_dirty = 1
         WHERE local_id = ?`,
        completed ? 1 : 0,
        now,
        row.local_id,
      );
      if (row.server_id === null) {
        await this.enqueueItemCreate(userId, messId, row.local_id, {
          weekday: row.weekday,
          name: row.name,
          price: row.price,
          completed,
        });
      } else {
        await this.outbox.enqueue<BazarMutationPayload>({
          dedupeKey: `bazar:item:status:${row.local_id}`,
          userId,
          messId,
          entityType: "bazar_item",
          entityId: row.local_id,
          operation: "command",
          payload: {
            localId: row.local_id,
            serverId: row.server_id,
            completed,
          },
        });
      }
      await this.ensureSyncState(userId, messId, now);
    });
    return toItem({
      ...row,
      is_completed: completed ? 1 : 0,
      local_updated_at: now,
      is_dirty: 1,
    });
  }

  async deleteItem(
    userId: number,
    messId: number,
    displayId: number,
  ): Promise<void> {
    const row = await this.requireItem(messId, displayId);
    await this.database.withTransactionAsync(async () => {
      if (row.server_id === null) {
        await this.database.runAsync(
          "DELETE FROM local_bazar_items WHERE local_id = ?",
          row.local_id,
        );
        await this.database.runAsync(
          "DELETE FROM offline_outbox WHERE user_id = ? AND entity_id = ?",
          userId,
          row.local_id,
        );
      } else {
        await this.database.runAsync(
          `UPDATE local_bazar_items
           SET is_deleted = 1, is_dirty = 1, local_updated_at = ?
           WHERE local_id = ?`,
          Date.now(),
          row.local_id,
        );
        await this.database.runAsync(
          `DELETE FROM offline_outbox
           WHERE user_id = ? AND entity_id = ? AND entity_type = 'bazar_item'`,
          userId,
          row.local_id,
        );
        await this.outbox.enqueue<BazarMutationPayload>({
          dedupeKey: `bazar:item:delete:${row.local_id}`,
          userId,
          messId,
          entityType: "bazar_item",
          entityId: row.local_id,
          operation: "delete",
          payload: { localId: row.local_id, serverId: row.server_id },
        });
      }
      await this.ensureSyncState(userId, messId, Date.now());
    });
  }

  async deleteWeekday(
    userId: number,
    messId: number,
    weekday: number,
  ): Promise<void> {
    const rows = await this.database.getAllAsync<ItemRow>(
      `SELECT * FROM local_bazar_items
       WHERE mess_id = ? AND weekday = ? AND is_deleted = 0`,
      messId,
      weekday,
    );
    for (const row of rows)
      await this.deleteItem(userId, messId, row.display_id);
  }

  async setAssignments(
    userId: number,
    messId: number,
    input: DesiredAssignmentInput,
  ): Promise<ApiBazarAssignment[]> {
    const now = Date.now();
    const selected = new Set(input.consumerIds);
    const existing = await this.database.getAllAsync<AssignmentRow>(
      `SELECT * FROM local_bazar_assignments
       WHERE mess_id = ? AND weekday = ?`,
      messId,
      input.weekday,
    );
    const byConsumer = new Map(existing.map((row) => [row.consumer_id, row]));
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        "DELETE FROM local_bazar_assignments WHERE mess_id = ? AND weekday = ?",
        messId,
        input.weekday,
      );
      for (const consumerId of selected) {
        const consumer = input.consumers.find(
          (entry) => entry.id === consumerId,
        );
        if (!consumer) throw new Error("Selected consumer is not cached.");
        const previous = byConsumer.get(consumerId);
        await this.database.runAsync(
          `INSERT INTO local_bazar_assignments (
            local_id, server_id, display_id, mess_id, weekday, consumer_id,
            name, email, local_updated_at, is_dirty
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          previous?.local_id ?? Crypto.randomUUID(),
          previous?.server_id ?? null,
          previous?.display_id ?? tempId(),
          messId,
          input.weekday,
          consumerId,
          consumer.name,
          consumer.email ?? null,
          now,
        );
      }
      await this.outbox.enqueue<BazarMutationPayload>({
        dedupeKey: `bazar:assignments:${messId}:${input.weekday}`,
        userId,
        messId,
        entityType: "bazar_assignments",
        entityId: String(input.weekday),
        operation: "upsert",
        payload: { weekday: input.weekday, consumerIds: [...selected] },
      });
      await this.ensureSyncState(userId, messId, now);
    });
    const rows = await this.database.getAllAsync<AssignmentRow>(
      `SELECT * FROM local_bazar_assignments
       WHERE mess_id = ? AND weekday = ? ORDER BY display_id ASC`,
      messId,
      input.weekday,
    );
    return rows.map(toAssignment);
  }

  async markNotificationsRead(userId: number, messId: number): Promise<void> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO local_bazar_notification_state (
          user_id, mess_id, unread_count, read_pending, updated_at
        ) VALUES (?, ?, 0, 1, ?)
        ON CONFLICT(user_id, mess_id) DO UPDATE SET
          unread_count = 0,
          read_pending = 1,
          updated_at = excluded.updated_at`,
        userId,
        messId,
        now,
      );
      await this.outbox.enqueue<BazarMutationPayload>({
        dedupeKey: `bazar:notifications:read:${userId}:${messId}`,
        userId,
        messId,
        entityType: "bazar_notification",
        entityId: "read",
        operation: "command",
        payload: {},
      });
      await this.ensureSyncState(userId, messId, now);
    });
  }

  async enqueueNotifyMembers(
    userId: number,
    messId: number,
    weekday: number,
  ): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      await this.outbox.enqueue<BazarMutationPayload>({
        dedupeKey: `bazar:notifications:notify:${messId}:${weekday}`,
        userId,
        messId,
        entityType: "bazar_notification",
        entityId: `notify:${weekday}`,
        operation: "command",
        payload: { weekday },
      });
      await this.ensureSyncState(userId, messId, Date.now());
    });
  }

  async getItemByLocalId(localId: string): Promise<ItemRow | null> {
    return this.database.getFirstAsync<ItemRow>(
      "SELECT * FROM local_bazar_items WHERE local_id = ?",
      localId,
    );
  }

  async acknowledgeItem(
    localId: string,
    item: ApiBazarItem,
    operationId: string,
  ): Promise<void> {
    const other = await this.database.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM offline_outbox
       WHERE entity_type = 'bazar_item' AND entity_id = ? AND id <> ?`,
      localId,
      operationId,
    );
    if (Number(other?.total ?? 0) > 0) {
      await this.database.runAsync(
        `UPDATE local_bazar_items
         SET server_id = ?, display_id = ?, server_updated_at = ?
         WHERE local_id = ?`,
        item.id,
        item.id,
        item.updatedAt,
        localId,
      );
      return;
    }
    await this.database.runAsync(
      `UPDATE local_bazar_items SET
        server_id = ?, display_id = ?, weekday = ?, name = ?, price = ?,
        is_completed = ?, created_by_user_id = ?, created_at = ?,
        server_updated_at = ?, local_updated_at = ?, is_dirty = 0,
        is_deleted = 0
       WHERE local_id = ?`,
      item.id,
      item.id,
      item.weekday,
      item.name,
      item.price,
      item.isCompleted ? 1 : 0,
      item.createdByUserId,
      item.createdAt,
      item.updatedAt,
      Date.now(),
      localId,
    );
  }

  async acknowledgeDelete(localId: string): Promise<void> {
    await this.database.runAsync(
      "DELETE FROM local_bazar_items WHERE local_id = ?",
      localId,
    );
  }

  async acknowledgeAssignments(
    messId: number,
    weekday: number,
    assignments: ApiBazarAssignment[],
  ): Promise<void> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        "DELETE FROM local_bazar_assignments WHERE mess_id = ? AND weekday = ?",
        messId,
        weekday,
      );
      for (const assignment of assignments) {
        await this.insertServerAssignment(messId, assignment, now);
      }
    });
  }

  async acknowledgeNotificationsRead(
    userId: number,
    messId: number,
  ): Promise<void> {
    await this.database.runAsync(
      `UPDATE local_bazar_notification_state
       SET unread_count = 0, read_pending = 0, updated_at = ?
       WHERE user_id = ? AND mess_id = ?`,
      Date.now(),
      userId,
      messId,
    );
  }

  private async requireItem(
    messId: number,
    displayId: number,
  ): Promise<ItemRow> {
    const row = await this.database.getFirstAsync<ItemRow>(
      `SELECT * FROM local_bazar_items
       WHERE mess_id = ? AND display_id = ? AND is_deleted = 0`,
      messId,
      displayId,
    );
    if (!row) throw new Error("Bazar item not found.");
    return row;
  }

  private async enqueueItemCreate(
    userId: number,
    messId: number,
    localId: string,
    input: {
      weekday: number;
      name: string;
      price: number;
      completed?: boolean;
    },
  ): Promise<void> {
    await this.outbox.enqueue<BazarMutationPayload>({
      dedupeKey: `bazar:item:create:${localId}`,
      userId,
      messId,
      entityType: "bazar_item",
      entityId: localId,
      operation: "create",
      payload: { localId, ...input },
    });
  }

  private async upsertServerItem(
    messId: number,
    item: ApiBazarItem,
    now: number,
  ): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO local_bazar_items (
        local_id, server_id, display_id, mess_id, weekday, name, price,
        is_completed, created_by_user_id, created_at, server_updated_at,
        local_updated_at, is_dirty, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      ON CONFLICT(mess_id, server_id) WHERE server_id IS NOT NULL DO UPDATE SET
        display_id = excluded.display_id,
        weekday = excluded.weekday,
        name = excluded.name,
        price = excluded.price,
        is_completed = excluded.is_completed,
        created_by_user_id = excluded.created_by_user_id,
        created_at = excluded.created_at,
        server_updated_at = excluded.server_updated_at,
        local_updated_at = excluded.local_updated_at,
        is_dirty = 0,
        is_deleted = 0`,
      `server:${item.id}`,
      item.id,
      item.id,
      messId,
      item.weekday,
      item.name,
      item.price,
      item.isCompleted ? 1 : 0,
      item.createdByUserId,
      item.createdAt,
      item.updatedAt,
      now,
    );
  }

  private async insertServerAssignment(
    messId: number,
    assignment: ApiBazarAssignment,
    now: number,
  ): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO local_bazar_assignments (
        local_id, server_id, display_id, mess_id, weekday, consumer_id,
        name, email, local_updated_at, is_dirty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      `server:${assignment.id}`,
      assignment.id,
      assignment.id,
      messId,
      assignment.weekday,
      assignment.consumerId,
      assignment.name,
      assignment.email,
      now,
    );
  }

  private async saveSyncState(
    userId: number,
    messId: number,
    now: number,
  ): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO sync_state (
        scope_key, user_id, mess_id, collection, cursor,
        last_synced_at, last_error, updated_at
      ) VALUES (?, ?, ?, ?, NULL, ?, NULL, ?)
      ON CONFLICT(scope_key) DO UPDATE SET
        last_synced_at = excluded.last_synced_at,
        last_error = NULL,
        updated_at = excluded.updated_at`,
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
      `INSERT INTO sync_state (
        scope_key, user_id, mess_id, collection, cursor,
        last_synced_at, last_error, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)
      ON CONFLICT(scope_key) DO UPDATE SET updated_at = excluded.updated_at`,
      scopeKey(userId, messId),
      userId,
      messId,
      collection,
      now,
    );
  }
}
