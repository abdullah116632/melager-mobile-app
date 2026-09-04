import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import { OutboxRepository } from "../../repositories/outboxRepository";
import type { DayExpenseItem } from "@/types/mess";
const hash = (items: DayExpenseItem[]) =>
  JSON.stringify(items.map(({ id, name, amount }) => ({ id, name, amount })));
export class ExpenseRepository {
  private outbox: OutboxRepository;
  constructor(private db: SQLiteDatabase) {
    this.outbox = new OutboxRepository(db);
  }
  async save(
    userId: number,
    messId: number,
    yearMonth: string,
    day: number,
    items: DayExpenseItem[],
  ) {
    const old = await this.db.getFirstAsync<{
      items_json: string;
      base_hash: string;
    }>(
      "SELECT items_json,base_hash FROM local_expense_days WHERE user_id=? AND mess_id=? AND year_month=? AND day=?",
      userId,
      messId,
      yearMonth,
      day,
    );
    const baseHash = old?.base_hash ?? "empty";
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO local_expense_days VALUES(?,?,?,?,?,?,1,NULL,?) ON CONFLICT(user_id,mess_id,year_month,day) DO UPDATE SET items_json=excluded.items_json,is_dirty=1,conflict_message=NULL,updated_at=excluded.updated_at`,
        userId,
        messId,
        yearMonth,
        day,
        hash(items),
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
        payload: { yearMonth, day, items, baseHash },
      });
    });
  }
  async acknowledge(
    userId: number,
    messId: number,
    p: { yearMonth: string; day: number; items: DayExpenseItem[] },
  ) {
    await this.db.runAsync(
      "UPDATE local_expense_days SET base_hash=?,is_dirty=0 WHERE user_id=? AND mess_id=? AND year_month=? AND day=?",
      hash(p.items),
      userId,
      messId,
      p.yearMonth,
      p.day,
    );
  }
}
