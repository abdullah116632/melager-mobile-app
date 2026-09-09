import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { DayExpenseItem } from "@/types/mess";
import { OutboxRepository } from "../../repositories/outboxRepository";
import { runInTransaction } from "../../database/transaction";

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

const canonicalItems = (items: DayExpenseItem[]) =>
  items.map(({ id, name, amount }) => ({
    id: String(id),
    name: String(name).trim(),
    amount: Number(amount),
  }));

const serializeItems = (items: DayExpenseItem[]) =>
  JSON.stringify(canonicalItems(items));

const hashItems = (items: DayExpenseItem[]) =>
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
    const old = await this.db.getFirstAsync<{ base_hash: string }>(
      `SELECT base_hash FROM local_expense_days
       WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?`,
      userId,
      messId,
      yearMonth,
      day,
    );
    const baseHash = old?.base_hash ?? "empty";
    const normalizedItems = canonicalItems(items);
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        `INSERT INTO local_expense_days
           (user_id, mess_id, year_month, day, items_json, base_hash,
            is_dirty, conflict_message, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, NULL, ?)
         ON CONFLICT(user_id, mess_id, year_month, day) DO UPDATE SET
           items_json = excluded.items_json,
           is_dirty = 1,
           conflict_message = NULL,
           updated_at = excluded.updated_at`,
        userId,
        messId,
        yearMonth,
        day,
        serializeItems(normalizedItems),
        baseHash,
        Date.now(),
      );
      await this.outbox.enqueue({
        userId,
        messId,
        entityType: "expense",
        entityId: `${yearMonth}:${day}`,
        operation: "upsert",
        dedupeKey: `expense:${messId}:${yearMonth}:${day}`,
        payload: { yearMonth, day, items: normalizedItems, baseHash },
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
  ) {
    await this.db.runAsync(
      `UPDATE local_expense_days
       SET base_hash = ?, is_dirty = 0, conflict_message = NULL, updated_at = ?
       WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?`,
      await hashItems(payload.items),
      Date.now(),
      userId,
      messId,
      payload.yearMonth,
      payload.day,
    );
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
       SET base_hash = ?, conflict_message = ?, is_dirty = 1, updated_at = ?
       WHERE user_id = ? AND mess_id = ? AND year_month = ? AND day = ?`,
      await hashItems(serverItems),
      message,
      Date.now(),
      userId,
      messId,
      payload.yearMonth,
      payload.day,
    );
  }
}
