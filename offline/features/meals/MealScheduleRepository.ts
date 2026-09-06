import type { SQLiteDatabase } from "expo-sqlite";
import { OutboxRepository } from "../../repositories/outboxRepository";
import type {
  ConsumerMealStatus,
  MealSchedule,
  TodaySchedule,
} from "@/lib/api";
import type { MealScheduleMutation, MealScheduleSnapshot } from "./types";

interface ScheduleRow {
  payload_json: string;
  local_updated_at: number;
  is_dirty: number;
}

interface StoredSchedulePayload {
  schedule: TodaySchedule;
  consumers: ConsumerMealStatus[];
}

const emptyTodaySchedule = (
  date: string,
  schedule: MealSchedule,
): TodaySchedule => ({
  date,
  schedule,
  myOptOuts: [],
  totalConsumers: 0,
  activeByMeal: { breakfast: 0, lunch: 0, dinner: 0 },
  totalActive: 0,
});

const parsePayload = (row: ScheduleRow | null): StoredSchedulePayload | null =>
  row ? (JSON.parse(row.payload_json) as StoredSchedulePayload) : null;

const SCHEDULE_MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

/** Which meal(s) a partial v2 schedule update actually touches, from its field names. */
const scheduleMealTypesTouched = (
  schedule: MealScheduleMutation["schedule"],
): string => {
  if (!schedule) return "schedule";
  const touched = SCHEDULE_MEAL_TYPES.filter((mealType) =>
    Object.keys(schedule).some((field) => field.startsWith(mealType)),
  );
  return touched.length > 0 ? touched.join("+") : "schedule";
};

export class MealScheduleRepository {
  private readonly outbox: OutboxRepository;
  constructor(private readonly database: SQLiteDatabase) {
    this.outbox = new OutboxRepository(database);
  }

  private getRow(
    userId: number,
    messId: number,
    date: string,
  ): Promise<ScheduleRow | null> {
    return this.database.getFirstAsync<ScheduleRow>(
      "SELECT payload_json, local_updated_at, is_dirty FROM local_meal_schedules WHERE user_id = ? AND mess_id = ? AND date = ?",
      userId,
      messId,
      date,
    );
  }

  async getSnapshot(
    userId: number,
    messId: number,
    date: string,
  ): Promise<MealScheduleSnapshot | null> {
    const row = await this.getRow(userId, messId, date);
    if (!row) return null;
    const pending = await this.database.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM offline_outbox
       WHERE user_id = ? AND mess_id = ?
         AND entity_type IN ('meal_schedule','meal_opt_out')
         AND entity_id LIKE ?`,
      userId,
      messId,
      `${messId}:${date}:%`,
    );
    const payload = parsePayload(row)!;
    return {
      ...payload,
      pendingCount: Number(pending?.total ?? 0),
      savedAt: row.local_updated_at,
    };
  }

  async getCalendarMarkers(
    userId: number,
    messId: number,
    yearMonth: string,
  ): Promise<Record<string, string[]>> {
    const cached = await this.database.getFirstAsync<{ markers_json: string }>(
      `SELECT markers_json FROM local_meal_calendars
       WHERE user_id = ? AND mess_id = ? AND year_month = ?`,
      userId,
      messId,
      yearMonth,
    );
    if (cached) {
      return JSON.parse(cached.markers_json) as Record<string, string[]>;
    }
    const rows = await this.database.getAllAsync<{
      date: string;
      payload_json: string;
    }>(
      `SELECT date, payload_json FROM local_meal_schedules
       WHERE user_id = ? AND mess_id = ? AND date LIKE ?
       ORDER BY date`,
      userId,
      messId,
      `${yearMonth}-%`,
    );
    const markers: Record<string, string[]> = {};
    for (const row of rows) {
      const { schedule } = JSON.parse(
        row.payload_json,
      ) as StoredSchedulePayload;
      const optedOut = new Set(schedule.myOptOuts);
      const meals: string[] = [];
      if (schedule.schedule.breakfastEnabled && !optedOut.has("breakfast"))
        meals.push("B");
      if (schedule.schedule.lunchEnabled && !optedOut.has("lunch"))
        meals.push("L");
      if (schedule.schedule.dinnerEnabled && !optedOut.has("dinner"))
        meals.push("D");
      markers[row.date] = meals;
    }
    return markers;
  }

  async replaceCalendarMarkers(
    userId: number,
    messId: number,
    yearMonth: string,
    markers: Record<string, string[]>,
  ): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO local_meal_calendars (
        user_id, mess_id, year_month, markers_json, saved_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, mess_id, year_month) DO UPDATE SET
        markers_json=excluded.markers_json, saved_at=excluded.saved_at`,
      userId,
      messId,
      yearMonth,
      JSON.stringify(markers),
      Date.now(),
    );
  }

  async replaceRemoteSnapshot(
    userId: number,
    messId: number,
    date: string,
    schedule: TodaySchedule,
    consumers: ConsumerMealStatus[],
  ): Promise<boolean> {
    const existing = await this.getRow(userId, messId, date);
    if (existing?.is_dirty === 1) return false;
    await this.database.runAsync(
      `INSERT INTO local_meal_schedules (user_id, mess_id, date, payload_json, local_updated_at, is_dirty)
       VALUES (?, ?, ?, ?, ?, 0)
       ON CONFLICT(user_id, mess_id, date) DO UPDATE SET payload_json=excluded.payload_json, local_updated_at=excluded.local_updated_at, is_dirty=0`,
      userId,
      messId,
      date,
      JSON.stringify({ schedule, consumers }),
      Date.now(),
    );
    return true;
  }

  async replaceRemoteSchedule(
    userId: number,
    messId: number,
    date: string,
    schedule: TodaySchedule,
  ): Promise<boolean> {
    const existing = await this.getRow(userId, messId, date);
    return this.replaceRemoteSnapshot(
      userId,
      messId,
      date,
      schedule,
      parsePayload(existing)?.consumers ?? [],
    );
  }

  async saveSchedule(
    userId: number,
    messId: number,
    date: string,
    schedule: MealSchedule,
    mutation: MealScheduleMutation,
  ): Promise<void> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      const existing = parsePayload(await this.getRow(userId, messId, date));
      const payload: StoredSchedulePayload = {
        schedule: {
          ...(existing?.schedule ?? emptyTodaySchedule(date, schedule)),
          date,
          schedule,
        },
        consumers: existing?.consumers ?? [],
      };
      await this.database.runAsync(
        `INSERT INTO local_meal_schedules (user_id, mess_id, date, payload_json, local_updated_at, is_dirty)
         VALUES (?, ?, ?, ?, ?, 1)
         ON CONFLICT(user_id, mess_id, date) DO UPDATE SET payload_json=excluded.payload_json, local_updated_at=excluded.local_updated_at, is_dirty=1`,
        userId,
        messId,
        date,
        JSON.stringify(payload),
        now,
      );
      await this.enqueueMutation(userId, messId, date, mutation);
    });
  }

  async saveOptOut(
    userId: number,
    messId: number,
    date: string,
    mealType: "breakfast" | "lunch" | "dinner",
    scope: "day" | "ongoing",
    isOptedOut: boolean,
    fallbackSchedule: TodaySchedule,
  ): Promise<void> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      const existing = parsePayload(await this.getRow(userId, messId, date));
      const current = existing?.schedule ?? fallbackSchedule;
      const wasOptedOut = current.myOptOuts.includes(mealType);
      const delta = wasOptedOut === isOptedOut ? 0 : isOptedOut ? -1 : 1;
      const nextOptOuts = isOptedOut
        ? [...new Set([...current.myOptOuts, mealType])]
        : current.myOptOuts.filter((item) => item !== mealType);
      const nextSchedule: TodaySchedule = {
        ...current,
        date,
        myOptOuts: nextOptOuts,
        activeByMeal: {
          ...current.activeByMeal,
          [mealType]: Math.max(0, current.activeByMeal[mealType] + delta),
        },
        totalActive: Math.max(0, current.totalActive + delta),
      };

      const ownConsumer = await this.database.getFirstAsync<{
        consumer_id: number;
      }>(
        `SELECT consumer_id FROM reference_consumers
         WHERE user_id = ? AND mess_id = ? LIMIT 1`,
        userId,
        messId,
      );
      const consumers = (existing?.consumers ?? []).map((consumer) =>
        consumer.consumerId === ownConsumer?.consumer_id
          ? { ...consumer, [mealType]: !isOptedOut }
          : consumer,
      );

      await this.database.runAsync(
        `INSERT INTO local_meal_schedules (
          user_id, mess_id, date, payload_json, local_updated_at, is_dirty
        ) VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT(user_id, mess_id, date) DO UPDATE SET
          payload_json=excluded.payload_json,
          local_updated_at=excluded.local_updated_at,
          is_dirty=1`,
        userId,
        messId,
        date,
        JSON.stringify({ schedule: nextSchedule, consumers }),
        now,
      );
      await this.enqueueMutation(userId, messId, date, {
        date,
        mealType,
        scope,
        isOptedOut,
      });
    });
  }

  private enqueueMutation(
    userId: number,
    messId: number,
    date: string,
    mutation: MealScheduleMutation,
  ): Promise<unknown> {
    // A schedule mutation only ever carries the meal type(s) it actually
    // touches, so an edit to breakfast and a later, still-unsynced edit to
    // lunch must not collapse into one outbox row — that would silently
    // drop whichever one loses the dedupe race. The "optout:"/"schedule:"
    // namespace keeps an admin's own opt-out for a meal from colliding with
    // their schedule edit for that same meal — dedupe_key is unique per user
    // regardless of entity_type.
    const isOptOut = mutation.mealType !== undefined;
    const suffix = isOptOut
      ? `optout:${mutation.mealType}`
      : `schedule:${scheduleMealTypesTouched(mutation.schedule)}`;
    return this.outbox.enqueue({
      userId,
      messId,
      entityType: isOptOut ? "meal_opt_out" : "meal_schedule",
      entityId: `${messId}:${date}:${suffix}`,
      operation: "upsert",
      payload: mutation,
      dedupeKey: `meal:${suffix}:${messId}:${date}`,
    });
  }

  async markSynced(
    operationId: string,
    userId: number,
    messId: number,
    date: string,
  ): Promise<void> {
    await this.database.runAsync(
      `UPDATE local_meal_schedules
       SET is_dirty = CASE WHEN EXISTS (
         SELECT 1 FROM offline_outbox
         WHERE user_id = ? AND mess_id = ?
           AND entity_type IN ('meal_schedule','meal_opt_out')
           AND entity_id LIKE ? AND id <> ?
       ) THEN 1 ELSE 0 END
       WHERE user_id = ? AND mess_id = ? AND date = ?`,
      userId,
      messId,
      `${messId}:${date}:%`,
      operationId,
      userId,
      messId,
      date,
    );
  }
}
