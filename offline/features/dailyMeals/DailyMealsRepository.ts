import type { SQLiteDatabase } from "expo-sqlite";
import { OutboxRepository } from "../../repositories/outboxRepository";
import type { MealData } from "@/redux/slice/mealsSlice";
import { emitDailyMealConflictsChanged } from "./conflictEvents";

export interface DailyMealConflict {
  yearMonth: string;
  consumerId: string;
  day: number;
  localCount: number;
  serverCount: number;
  message: string;
}

export class DailyMealsRepository {
  private outbox: OutboxRepository;
  constructor(private db: SQLiteDatabase) {
    this.outbox = new OutboxRepository(db);
  }
  async mergeRemote(
    userId: number,
    messId: number,
    yearMonth: string,
    meals: MealData[string],
  ): Promise<MealData[string]> {
    const dirty = await this.db.getAllAsync<{
      consumer_id: string;
      day: number;
      count: number;
    }>(
      "SELECT consumer_id, day, count FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=? AND is_dirty=1",
      userId,
      messId,
      yearMonth,
    );
    await this.db.withTransactionAsync(async () => {
      for (const [consumerId, days] of Object.entries(meals))
        for (const [day, count] of Object.entries(days)) {
          const local = dirty.find(
            (row) => row.consumer_id === consumerId && row.day === Number(day),
          );
          if (local) continue;
          await this.db.runAsync(
            `INSERT INTO local_daily_meals (user_id,mess_id,year_month,consumer_id,day,count,base_count,is_dirty,updated_at) VALUES (?,?,?,?,?,?,?,0,?) ON CONFLICT(user_id,mess_id,year_month,consumer_id,day) DO UPDATE SET count=excluded.count,base_count=excluded.base_count,is_dirty=0,updated_at=excluded.updated_at`,
            userId,
            messId,
            yearMonth,
            consumerId,
            Number(day),
            count,
            count,
            Date.now(),
          );
        }
      await this.db.runAsync(
        `INSERT INTO local_daily_meal_months (user_id,mess_id,year_month,cursor,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,mess_id,year_month) DO UPDATE SET updated_at=excluded.updated_at`,
        userId,
        messId,
        yearMonth,
        null,
        Date.now(),
      );
    });
    return this.getMonth(userId, messId, yearMonth);
  }
  async getTrackedMonths(
    userId: number,
    messId: number,
  ): Promise<Array<{ yearMonth: string; cursor: string | null }>> {
    return this.db
      .getAllAsync<{ year_month: string; cursor: string | null }>(
        "SELECT year_month,cursor FROM local_daily_meal_months WHERE user_id=? AND mess_id=?",
        userId,
        messId,
      )
      .then((rows) =>
        rows.map((row) => ({ yearMonth: row.year_month, cursor: row.cursor })),
      );
  }
  async applyChanges(
    userId: number,
    messId: number,
    yearMonth: string,
    changes: Array<{ consumerId: string; day: number; count: number }>,
    cursor: string,
  ): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      for (const change of changes) {
        const dirty = await this.db.getFirstAsync<{ is_dirty: number }>(
          "SELECT is_dirty FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
          userId,
          messId,
          yearMonth,
          change.consumerId,
          change.day,
        );
        if (dirty?.is_dirty === 1) continue;
        await this.db.runAsync(
          `INSERT INTO local_daily_meals (user_id,mess_id,year_month,consumer_id,day,count,base_count,is_dirty,updated_at,conflict_message) VALUES (?,?,?,?,?,?,?,0,?,NULL) ON CONFLICT(user_id,mess_id,year_month,consumer_id,day) DO UPDATE SET count=excluded.count,base_count=excluded.base_count,is_dirty=0,updated_at=excluded.updated_at,conflict_message=NULL`,
          userId,
          messId,
          yearMonth,
          change.consumerId,
          change.day,
          change.count,
          change.count,
          Date.now(),
        );
      }
      await this.db.runAsync(
        `INSERT INTO local_daily_meal_months (user_id,mess_id,year_month,cursor,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,mess_id,year_month) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at`,
        userId,
        messId,
        yearMonth,
        cursor,
        Date.now(),
      );
    });
  }
  async getMonth(
    userId: number,
    messId: number,
    yearMonth: string,
  ): Promise<MealData[string]> {
    const rows = await this.db.getAllAsync<{
      consumer_id: string;
      day: number;
      count: number;
    }>(
      "SELECT consumer_id,day,count FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=?",
      userId,
      messId,
      yearMonth,
    );
    return rows.reduce<MealData[string]>((out, row) => {
      (out[row.consumer_id] ??= {})[String(row.day)] = Number(row.count);
      return out;
    }, {});
  }
  async update(
    userId: number,
    messId: number,
    yearMonth: string,
    consumerId: string,
    day: number,
    count: number,
  ): Promise<void> {
    const existing = await this.db.getFirstAsync<{
      count: number;
      base_count: number;
    }>(
      "SELECT count,base_count FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
      userId,
      messId,
      yearMonth,
      consumerId,
      day,
    );
    const baseCount = Number(existing?.base_count ?? existing?.count ?? 0);
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO local_daily_meals (user_id,mess_id,year_month,consumer_id,day,count,base_count,is_dirty,updated_at,conflict_message) VALUES (?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(user_id,mess_id,year_month,consumer_id,day) DO UPDATE SET count=excluded.count,is_dirty=1,updated_at=excluded.updated_at,conflict_message=NULL`,
        userId,
        messId,
        yearMonth,
        consumerId,
        day,
        count,
        baseCount,
        1,
        Date.now(),
      );
      await this.outbox.enqueue({
        userId,
        messId,
        entityType: "daily_meal",
        entityId: `${yearMonth}:${consumerId}:${day}`,
        operation: "upsert",
        dedupeKey: `daily-meal:${messId}:${yearMonth}:${consumerId}:${day}`,
        payload: { yearMonth, consumerId, day, count, baseCount },
      });
    });
  }
  async acknowledge(
    operationId: string,
    userId: number,
    messId: number,
    p: { yearMonth: string; consumerId: string; day: number; count: number },
  ): Promise<void> {
    const entityId = `${p.yearMonth}:${p.consumerId}:${p.day}`;
    const pending = await this.db.getAllAsync<{ id: string; payload: string }>(
      `SELECT id,payload FROM offline_outbox
       WHERE user_id=? AND mess_id=? AND entity_type='daily_meal'
         AND entity_id=? AND id<>?`,
      userId,
      messId,
      entityId,
      operationId,
    );
    if (pending.length > 0) {
      await this.db.withTransactionAsync(async () => {
        await this.db.runAsync(
          "UPDATE local_daily_meals SET base_count=?,is_dirty=1,updated_at=? WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
          p.count,
          Date.now(),
          userId,
          messId,
          p.yearMonth,
          p.consumerId,
          p.day,
        );
        for (const row of pending) {
          const payload = JSON.parse(row.payload) as Record<string, unknown>;
          await this.db.runAsync(
            "UPDATE offline_outbox SET payload=?,updated_at=? WHERE id=?",
            JSON.stringify({ ...payload, baseCount: p.count }),
            Date.now(),
            row.id,
          );
        }
      });
      return;
    }
    await this.db.runAsync(
      "UPDATE local_daily_meals SET count=?,base_count=?,is_dirty=0,conflict_message=NULL,updated_at=? WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
      p.count,
      p.count,
      Date.now(),
      userId,
      messId,
      p.yearMonth,
      p.consumerId,
      p.day,
    );
  }
  async markConflict(
    userId: number,
    messId: number,
    p: { yearMonth: string; consumerId: string; day: number },
    message: string,
    serverCount: number,
  ): Promise<void> {
    await this.db.runAsync(
      "UPDATE local_daily_meals SET conflict_message=?,base_count=?,is_dirty=1 WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
      message,
      serverCount,
      userId,
      messId,
      p.yearMonth,
      p.consumerId,
      p.day,
    );
    emitDailyMealConflictsChanged();
  }
  async getConflictCount(
    userId: number,
    messId: number,
    yearMonth: string,
  ): Promise<number> {
    const row = await this.db.getFirstAsync<{ total: number }>(
      "SELECT COUNT(*) AS total FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=? AND conflict_message IS NOT NULL",
      userId,
      messId,
      yearMonth,
    );
    return Number(row?.total ?? 0);
  }
  async getConflicts(
    userId: number,
    messId: number,
    yearMonth: string,
  ): Promise<DailyMealConflict[]> {
    const rows = await this.db.getAllAsync<{
      year_month: string;
      consumer_id: string;
      day: number;
      count: number;
      base_count: number;
      conflict_message: string;
    }>(
      "SELECT year_month,consumer_id,day,count,base_count,conflict_message FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=? AND conflict_message IS NOT NULL ORDER BY day,consumer_id",
      userId,
      messId,
      yearMonth,
    );
    return rows.map((row) => ({
      yearMonth: row.year_month,
      consumerId: row.consumer_id,
      day: row.day,
      localCount: Number(row.count),
      serverCount: Number(row.base_count),
      message: row.conflict_message,
    }));
  }
  async resolveConflict(
    userId: number,
    messId: number,
    conflict: DailyMealConflict,
    resolution: "local" | "server",
  ): Promise<number> {
    if (resolution === "local") {
      await this.update(
        userId,
        messId,
        conflict.yearMonth,
        conflict.consumerId,
        conflict.day,
        conflict.localCount,
      );
      emitDailyMealConflictsChanged();
      return conflict.localCount;
    }
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        "UPDATE local_daily_meals SET count=base_count,is_dirty=0,conflict_message=NULL,updated_at=? WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
        Date.now(),
        userId,
        messId,
        conflict.yearMonth,
        conflict.consumerId,
        conflict.day,
      );
      await this.db.runAsync(
        "DELETE FROM offline_outbox WHERE user_id=? AND mess_id=? AND dedupe_key=?",
        userId,
        messId,
        `daily-meal:${messId}:${conflict.yearMonth}:${conflict.consumerId}:${conflict.day}`,
      );
      await this.db.runAsync(
        "DELETE FROM offline_outbox_dead_letters WHERE user_id=? AND mess_id=? AND dedupe_key=?",
        userId,
        messId,
        `daily-meal:${messId}:${conflict.yearMonth}:${conflict.consumerId}:${conflict.day}`,
      );
    });
    emitDailyMealConflictsChanged();
    return conflict.serverCount;
  }
}
