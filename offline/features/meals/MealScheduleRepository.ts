import type { SQLiteDatabase } from "expo-sqlite";
import { OutboxRepository } from "../../repositories/outboxRepository";
import type { ConsumerMealStatus, MealSchedule, TodaySchedule } from "@/lib/api";
import type { MealScheduleMutation, MealScheduleSnapshot } from "./types";

const key = (userId: number, messId: number, date: string) =>
  `${userId}:${messId}:meal_schedule:${date}`;

export class MealScheduleRepository {
  private readonly outbox: OutboxRepository;
  constructor(private readonly database: SQLiteDatabase) {
    this.outbox = new OutboxRepository(database);
  }

  async getSnapshot(userId: number, messId: number, date: string): Promise<MealScheduleSnapshot | null> {
    const row = await this.database.getFirstAsync<{ payload_json: string; local_updated_at: number }>(
      "SELECT payload_json, local_updated_at FROM local_meal_schedules WHERE user_id = ? AND mess_id = ? AND date = ?",
      userId, messId, date,
    );
    if (!row) return null;
    const pending = await this.database.getFirstAsync<{ total: number }>(
      "SELECT COUNT(*) AS total FROM offline_outbox WHERE user_id = ? AND mess_id = ? AND entity_type IN ('meal_schedule','meal_opt_out')",
      userId, messId,
    );
    const payload = JSON.parse(row.payload_json) as { schedule: TodaySchedule; consumers: ConsumerMealStatus[] };
    return { ...payload, pendingCount: Number(pending?.total ?? 0), savedAt: row.local_updated_at };
  }

  async replaceRemoteSnapshot(userId: number, messId: number, date: string, schedule: TodaySchedule, consumers: ConsumerMealStatus[]): Promise<void> {
    const dirty = await this.database.getFirstAsync<{ is_dirty: number }>(
      "SELECT is_dirty FROM local_meal_schedules WHERE user_id = ? AND mess_id = ? AND date = ?", userId, messId, date,
    );
    if (dirty?.is_dirty === 1) return;
    await this.database.runAsync(
      `INSERT INTO local_meal_schedules (user_id, mess_id, date, payload_json, local_updated_at, is_dirty)
       VALUES (?, ?, ?, ?, ?, 0)
       ON CONFLICT(user_id, mess_id, date) DO UPDATE SET payload_json=excluded.payload_json, local_updated_at=excluded.local_updated_at, is_dirty=0`,
      userId, messId, date, JSON.stringify({ schedule, consumers }), Date.now(),
    );
  }

  async saveSchedule(userId: number, messId: number, date: string, schedule: MealSchedule, mutation: MealScheduleMutation): Promise<void> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO local_meal_schedules (user_id, mess_id, date, payload_json, local_updated_at, is_dirty)
         VALUES (?, ?, ?, ?, ?, 1)
         ON CONFLICT(user_id, mess_id, date) DO UPDATE SET payload_json=excluded.payload_json, local_updated_at=excluded.local_updated_at, is_dirty=1`,
        userId, messId, date, JSON.stringify({ schedule: { date, schedule, myOptOuts: [], totalConsumers: 0, activeByMeal: { breakfast: 0, lunch: 0, dinner: 0 }, totalActive: 0 }, consumers: [] }), now,
      );
      await this.outbox.enqueue({ userId, messId, entityType: mutation.mealType ? "meal_opt_out" : "meal_schedule", entityId: `${messId}:${date}:${mutation.mealType ?? "schedule"}`, operation: "upsert", payload: mutation, dedupeKey: `meal:${mutation.mealType ?? "schedule"}:${messId}:${date}` });
    });
  }

  async markSynced(userId: number, messId: number, date: string): Promise<void> {
    await this.database.runAsync("UPDATE local_meal_schedules SET is_dirty = 0 WHERE user_id = ? AND mess_id = ? AND date = ?", userId, messId, date);
  }
}
