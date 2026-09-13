import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { DayExpenseItem } from "@/types/mess";
import { OutboxRepository } from "../../repositories/outboxRepository";
import { runInTransaction } from "../../database/transaction";
import {
  emitExpenseConflictsChanged,
  mergeExpenseItems,
  type ExpenseConflict,
} from "./conflicts";

export interface LocalExpenseDay {
  items: DayExpenseItem[];
  conflictMessage: string | null;
}

type LocalExpenseMonth = Record<string, LocalExpenseDay>;

interface ExpenseRow {
  day: number;
  items_json: string;
  conflict_message: string | null;
}

export interface ExpensePayload {
  yearMonth: string;
  day: number;
  items: DayExpenseItem[];
  baseHash: string;
  /** Hashes of replaced lists that may already have reached the server. */
  sentHashes?: string[];
}

const canonicalItems = (items: DayExpenseItem[]) =>
  items.map(({ id, name, amount }) => ({
    id: String(id),
    name: String(name).trim(),
    amount: Number(amount),
  }));

const serializeItems = (items: DayExpenseItem[]) =>
  JSON.stringify(canonicalItems(items));

/** The same hash the server computes for a day's items. */
export const hashItems = (items: DayExpenseItem[]) =>
  Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    serializeItems(items),
  );

const parseItems = (value: string): DayExpenseItem[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as DayExpenseItem[]) : [];
  } catch {
    return [];
  }
};

export class ExpenseRepository {
  private readonly outbox: OutboxRepository;

  constructor(private readonly db: SQLiteDatabase) {
    this.outbox = new OutboxRepository(db);
  }

  async getMonth(
    userId: number,
    messId: number,
    yearMonth: string,
  ): Promise<LocalExpenseMonth> {
    const rows = await this.db.getAllAsync<ExpenseRow>(
      `SELECT day, items_json, conflict_message
       FROM local_expense_days
       WHERE user_id = ? AND mess_id = ? AND year_month = ?
       ORDER BY day`,
      userId,
      messId,
      yearMonth,
    );
    const month: LocalExpenseMonth = {};
    for (const row of rows) {
      month[String(row.day)] = {
        items: parseItems(row.items_json),
        conflictMessage: row.conflict_message,
      };
    }
    return month;
  }

  async getTrackedMonths(userId: number, messId: number): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ year_month: string }>(
      `SELECT year_month
       FROM local_expense_months
       WHERE user_id = ? AND mess_id = ?
       ORDER BY year_month DESC`,
      userId,
      messId,
    );
    return rows.map((row) => row.year_month);
  }

  async hasMonthSnapshot(
    userId: number,
    messId: number,
    yearMonth: string,
  ): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ found: number }>(
      `SELECT 1 AS found
       FROM local_expense_months
       WHERE user_id = ? AND mess_id = ? AND year_month = ?`,
      userId,
      messId,
      yearMonth,
    );
    return row?.found === 1;
  }

  async mergeRemote(
    userId: number,
    messId: number,
    yearMonth: string,
    expenses: Record<string, { items: DayExpenseItem[] }>,
  ): Promise<LocalExpenseMonth> {
    const snapshots = await Promise.all(
      Object.entries(expenses).map(async ([day, value]) => ({
        day: Number(day),
        items: canonicalItems(value.items ?? []),
        baseHash: await hashItems(value.items ?? []),
      })),
    );

    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        `DELETE FROM local_expense_days
         WHERE user_id = ? AND mess_id = ? AND year_month = ? AND is_dirty = 0`,
        userId,
        messId,
        yearMonth,
      );
      for (const snapshot of snapshots) {
        if (!Number.isInteger(snapshot.day) || snapshot.day < 1) continue;
        await this.db.runAsync(
          `INSERT INTO local_expense_days
             (user_id, mess_id, year_month, day, items_json, base_hash,
              is_dirty, conflict_message, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?)
           ON CONFLICT(user_id, mess_id, year_month, day) DO UPDATE SET
             items_json = excluded.items_json,
             base_hash = excluded.base_hash,
             is_dirty = 0,
             conflict_message = NULL,
             updated_at = excluded.updated_at
           WHERE local_expense_days.is_dirty = 0`,
          userId,
          messId,
          yearMonth,
          snapshot.day,
          serializeItems(snapshot.items),
          snapshot.baseHash,
          Date.now(),
        );
      }
      await this.db.runAsync(
        `INSERT INTO local_expense_months(user_id, mess_id, year_month, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, mess_id, year_month) DO UPDATE SET
           updated_at = excluded.updated_at`,
        userId,
        messId,
        yearMonth,
        Date.now(),
      );
    });
    return this.getMonth(userId, messId, yearMonth);
  }

  async save(
    userId: number,
    messId: number,
    yearMonth: string,
    day: number,
    items: DayExpenseItem[],
  ) {
    const normalizedItems = canonicalItems(items);
    const dedupeKey = `expense:${messId}:${yearMonth}:${day}`;
    await runInTransaction(this.db, async () => {
      const old = await this.db.getFirstAsync<{ base_hash: string }>(
        `SELECT base_hash FROM local_expense_days
         WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?`,
        userId,
        messId,
        yearMonth,
        day,
      );
      const baseHash = old?.base_hash ?? "empty";
      // A replaced list that may already be on the server is remembered, so
      // finding it there later is not mistaken for another device's edit.
      const previousRow = await this.db.getFirstAsync<{ payload: string }>(
        "SELECT payload FROM offline_outbox WHERE user_id = ? AND dedupe_key = ?",
        userId,
        dedupeKey,
      );
      const previous = previousRow
        ? (JSON.parse(previousRow.payload) as ExpensePayload)
        : null;
      const sentHashes = [...(previous?.sentHashes ?? [])];
      if (
        previous &&
        (await this.outbox.getDeliveryState(userId, dedupeKey)) === "maybe-sent"
      ) {
        sentHashes.push(await hashItems(previous.items));
      }
      await this.db.runAsync(
        `INSERT INTO local_expense_days
           (user_id, mess_id, year_month, day, items_json, base_hash,
            is_dirty, conflict_message, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?)
         ON CONFLICT(user_id, mess_id, year_month, day) DO UPDATE SET
           items_json = excluded.items_json,
           is_dirty = 1,
           conflict_message = NULL,
           conflict_server_items = NULL,
           updated_at = excluded.updated_at`,
        userId,
        messId,
        yearMonth,
        day,
        serializeItems(normalizedItems),
        baseHash,
        Date.now(),
      );
      const payload: ExpensePayload = {
        yearMonth,
        day,
        items: normalizedItems,
        baseHash,
        sentHashes,
      };
      await this.outbox.enqueue({
        userId,
        messId,
        entityType: "expense",
        entityId: `${yearMonth}:${day}`,
        operation: "upsert",
        dedupeKey,
        payload,
      });
      await this.db.runAsync(
        `INSERT INTO local_expense_months(user_id, mess_id, year_month, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, mess_id, year_month) DO UPDATE SET
           updated_at = excluded.updated_at`,
        userId,
        messId,
        yearMonth,
        Date.now(),
      );
    });
  }

  async acknowledge(
    userId: number,
    messId: number,
    payload: { yearMonth: string; day: number; items: DayExpenseItem[] },
    operationId: string,
  ) {
    const baseHash = await hashItems(payload.items);
    await runInTransaction(this.db, async () => {
      const newer = await this.db.getFirstAsync<{
        id: string;
        payload: string;
      }>(
        `SELECT id, payload FROM offline_outbox
         WHERE user_id = ? AND dedupe_key = ? AND id <> ?`,
        userId,
        `expense:${messId}:${payload.yearMonth}:${payload.day}`,
        operationId,
      );
      if (newer) {
        // An edit queued while this one was in flight still has to be pushed,
        // now on top of the list the server just accepted.
        await this.db.runAsync(
          `UPDATE local_expense_days SET base_hash = ?
           WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?`,
          baseHash,
          userId,
          messId,
          payload.yearMonth,
          payload.day,
        );
        await this.db.runAsync(
          "UPDATE offline_outbox SET payload = ?, updated_at = ? WHERE id = ?",
          JSON.stringify({
            ...(JSON.parse(newer.payload) as ExpensePayload),
            baseHash,
          }),
          Date.now(),
          newer.id,
        );
        return;
      }
      await this.db.runAsync(
        `UPDATE local_expense_days
         SET base_hash = ?, is_dirty = 0, conflict_message = NULL,
             conflict_server_items = NULL, updated_at = ?
         WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?`,
        baseHash,
        Date.now(),
        userId,
        messId,
        payload.yearMonth,
        payload.day,
      );
    });
  }

  /** The server holds a list this device sent earlier: retry on top of it. */
  async rebase(
    operationId: string,
    userId: number,
    messId: number,
    payload: { yearMonth: string; day: number },
    serverHash: string,
  ) {
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        `UPDATE local_expense_days SET base_hash = ?
         WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?`,
        serverHash,
        userId,
        messId,
        payload.yearMonth,
        payload.day,
      );
      const row = await this.db.getFirstAsync<{ payload: string }>(
        "SELECT payload FROM offline_outbox WHERE id = ?",
        operationId,
      );
      if (!row) return;
      await this.db.runAsync(
        "UPDATE offline_outbox SET payload = ?, updated_at = ? WHERE id = ?",
        JSON.stringify({
          ...(JSON.parse(row.payload) as ExpensePayload),
          baseHash: serverHash,
          sentHashes: [],
        }),
        Date.now(),
        operationId,
      );
    });
  }

  async markConflict(
    userId: number,
    messId: number,
    payload: { yearMonth: string; day: number },
    message: string,
    serverItems: DayExpenseItem[],
  ) {
    await this.db.runAsync(
      `UPDATE local_expense_days
       SET base_hash = ?, conflict_message = ?, conflict_server_items = ?,
           is_dirty = 1, updated_at = ?
       WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?`,
      await hashItems(serverItems),
      message,
      serializeItems(serverItems),
      Date.now(),
      userId,
      messId,
      payload.yearMonth,
      payload.day,
    );
    emitExpenseConflictsChanged();
  }

  async getConflicts(
    userId: number,
    messId: number,
  ): Promise<ExpenseConflict[]> {
    const rows = await this.db.getAllAsync<{
      year_month: string;
      day: number;
      items_json: string;
      conflict_server_items: string;
    }>(
      `SELECT year_month, day, items_json, conflict_server_items
       FROM local_expense_days
       WHERE user_id = ? AND mess_id = ?
         AND conflict_message IS NOT NULL AND conflict_server_items IS NOT NULL
       ORDER BY year_month, day`,
      userId,
      messId,
    );
    return rows.map((row) => ({
      yearMonth: row.year_month,
      day: row.day,
      localItems: parseItems(row.items_json),
      serverItems: parseItems(row.conflict_server_items),
    }));
  }

  /**
   * "local" pushes this device's list over the server's, "both" pushes every
   * item from both lists, and "server" adopts the server's list here.
   */
  async resolveConflict(
    userId: number,
    messId: number,
    yearMonth: string,
    day: number,
    resolution: "local" | "server" | "both",
  ) {
    const row = await this.db.getFirstAsync<{
      items_json: string;
      conflict_server_items: string | null;
    }>(
      `SELECT items_json, conflict_server_items FROM local_expense_days
       WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?
         AND conflict_message IS NOT NULL`,
      userId,
      messId,
      yearMonth,
      day,
    );
    if (!row?.conflict_server_items) return;
    const localItems = parseItems(row.items_json);
    const serverItems = parseItems(row.conflict_server_items);
    if (resolution === "server") {
      const serverHash = await hashItems(serverItems);
      await this.db.runAsync(
        `UPDATE local_expense_days
         SET items_json = ?, base_hash = ?, is_dirty = 0,
             conflict_message = NULL, conflict_server_items = NULL,
             updated_at = ?
         WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?`,
        serializeItems(serverItems),
        serverHash,
        Date.now(),
        userId,
        messId,
        yearMonth,
        day,
      );
    } else {
      // base_hash already holds the server's hash, so this save replaces it.
      await this.save(
        userId,
        messId,
        yearMonth,
        day,
        resolution === "both"
          ? mergeExpenseItems(serverItems, localItems)
          : localItems,
      );
    }
    emitExpenseConflictsChanged();
  }
}
