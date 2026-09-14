import type { SQLiteDatabase } from "expo-sqlite";
import { OutboxRepository } from "../../repositories/outboxRepository";
import type { MealData } from "@/redux/slice/mealsSlice";
import { emitDailyMealConflictsChanged } from "./conflictEvents";
import { runInTransaction } from "../../database/transaction";

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
    remoteRequestStartedAt = Number.POSITIVE_INFINITY,
    confirmAcknowledged = false,
  ): Promise<MealData[string]> {
    const localRows = await this.db.getAllAsync<{
      consumer_id: string;
      day: number;
      count: number;
      is_dirty: number;
      sync_state: number;
      updated_at: number;
    }>(
      `SELECT consumer_id, day, count, is_dirty, sync_state, updated_at
       FROM local_daily_meals
       WHERE user_id=? AND mess_id=? AND year_month=?`,
      userId,
      messId,
      yearMonth,
    );
    await runInTransaction(this.db, async () => {
      for (const [consumerId, days] of Object.entries(meals))
        for (const [day, count] of Object.entries(days)) {
          const numericDay = Number(day);
          const local = localRows.find(
            (row) => row.consumer_id === consumerId && row.day === Number(day),
          );
          // This response may have started before a local mutation was
          // acknowledged. In that case it is stale even if the row is no
          // longer marked dirty, and must not erase the newer local value.
          if (
            local &&
            ((local.is_dirty === 1 &&
              (!confirmAcknowledged || local.sync_state !== 2)) ||
              local.updated_at > remoteRequestStartedAt)
          ) {
            continue;
          }
          await this.db.runAsync(
            `INSERT INTO local_daily_meals (user_id,mess_id,year_month,consumer_id,day,count,base_count,is_dirty,sync_state,updated_at) VALUES (?,?,?,?,?,?,?,0,0,?) ON CONFLICT(user_id,mess_id,year_month,consumer_id,day) DO UPDATE SET count=excluded.count,base_count=excluded.base_count,is_dirty=0,sync_state=0,updated_at=excluded.updated_at`,
            userId,
            messId,
            yearMonth,
            consumerId,
            numericDay,
            count,
            count,
            Date.now(),
          );
        }
      // Some legacy servers omit zero-valued rows. A successfully pushed
      // removal is nevertheless confirmed by that absence; preserve its 0 in
      // SQLite and make it clean only after this fresh post-push snapshot.
      if (confirmAcknowledged) {
        for (const local of localRows) {
          if (local.sync_state !== 2) continue;
          const serverHasCell = meals[local.consumer_id]?.[String(local.day)];
          if (serverHasCell !== undefined) continue;
          await this.db.runAsync(
            `UPDATE local_daily_meals
             SET base_count=count, is_dirty=0, sync_state=0, updated_at=?
             WHERE user_id=? AND mess_id=? AND year_month=?
               AND consumer_id=? AND day=? AND sync_state=2`,
            Date.now(),
            userId,
            messId,
            yearMonth,
            local.consumer_id,
            local.day,
          );
        }
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
  /**
   * An unsynced edit whose outbox row is gone was rejected by the server and
   * dead-lettered. Nothing will send it again and pulls skip unsynced cells, so
   * fall back to the last server value; the pull that follows refreshes it.
   * Conflicts (kept for review) and pushed cells awaiting confirmation stay.
   */
  async releaseOrphanedEdits(userId: number, messId: number): Promise<void> {
    await this.db.runAsync(
      `UPDATE local_daily_meals
       SET count = base_count, is_dirty = 0, sync_state = 0
       WHERE user_id = ? AND mess_id = ? AND is_dirty = 1 AND sync_state = 1
         AND conflict_message IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM offline_outbox
           WHERE offline_outbox.user_id = local_daily_meals.user_id
             AND offline_outbox.dedupe_key = 'daily-meal:' || local_daily_meals.mess_id
               || ':' || local_daily_meals.year_month
               || ':' || local_daily_meals.consumer_id
               || ':' || local_daily_meals.day
         )`,
      userId,
      messId,
    );
  }
  async consumerName(
    messId: number,
    consumerId: string,
  ): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ name: string }>(
      "SELECT name FROM reference_consumers WHERE mess_id=? AND consumer_id=?",
      messId,
      Number(consumerId),
    );
    return row?.name ?? null;
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
    await runInTransaction(this.db, async () => {
      for (const change of changes) {
        const local = await this.db.getFirstAsync<{ sync_state: number }>(
          "SELECT sync_state FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
          userId,
          messId,
          yearMonth,
          change.consumerId,
          change.day,
        );
        // Only an edit that has not reached the server yet (sync_state 1) may
        // override the change feed. A row still marked dirty because it is
        // waiting to be confirmed (sync_state 2) must accept the feed: the
        // first entry for it is this device's own push, and anything after
        // that is a newer edit from somebody else.
        if (local?.sync_state === 1) continue;
        await this.db.runAsync(
          `INSERT INTO local_daily_meals (user_id,mess_id,year_month,consumer_id,day,count,base_count,is_dirty,sync_state,updated_at,conflict_message) VALUES (?,?,?,?,?,?,?,0,0,?,NULL) ON CONFLICT(user_id,mess_id,year_month,consumer_id,day) DO UPDATE SET count=excluded.count,base_count=excluded.base_count,is_dirty=0,sync_state=0,updated_at=excluded.updated_at,conflict_message=NULL`,
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

      // A pushed row that the feed never mentioned is still confirmed: the
      // server answered 200 for exactly this value. Leaving it dirty would
      // make every later pull skip the cell forever, so this device would
      // never again see another member's edit to it.
      await this.db.runAsync(
        `UPDATE local_daily_meals
         SET base_count = count, is_dirty = 0, sync_state = 0, updated_at = ?
         WHERE user_id=? AND mess_id=? AND year_month=? AND sync_state=2`,
        Date.now(),
        userId,
        messId,
        yearMonth,
      );
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
    const dedupeKey = `daily-meal:${messId}:${yearMonth}:${consumerId}:${day}`;
    await runInTransaction(this.db, async () => {
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
      // A replaced value that may already be on the server is remembered, so
      // finding it there later is not mistaken for another device's edit.
      const previousRow = await this.db.getFirstAsync<{ payload: string }>(
        "SELECT payload FROM offline_outbox WHERE user_id=? AND dedupe_key=?",
        userId,
        dedupeKey,
      );
      const previous = previousRow
        ? (JSON.parse(previousRow.payload) as {
            count: number;
            sentCounts?: number[];
          })
        : null;
      const sentCounts = [...(previous?.sentCounts ?? [])];
      if (
        previous &&
        (await this.outbox.getDeliveryState(userId, dedupeKey)) === "maybe-sent"
      ) {
        sentCounts.push(Number(previous.count));
      }
      await this.db.runAsync(
        `INSERT INTO local_daily_meals (user_id,mess_id,year_month,consumer_id,day,count,base_count,is_dirty,sync_state,updated_at,conflict_message) VALUES (?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(user_id,mess_id,year_month,consumer_id,day) DO UPDATE SET count=excluded.count,is_dirty=1,sync_state=1,updated_at=excluded.updated_at,conflict_message=NULL`,
        userId,
        messId,
        yearMonth,
        consumerId,
        day,
        count,
        baseCount,
        1,
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
        payload: { yearMonth, consumerId, day, count, baseCount, sentCounts },
      });
      // A month created entirely offline still needs a reconnect pull. Without
      // this marker it was absent from the daily-meal puller's tracked months.
      await this.db.runAsync(
        `INSERT INTO local_daily_meal_months
           (user_id,mess_id,year_month,cursor,updated_at)
         VALUES (?,?,?,?,?)
         ON CONFLICT(user_id,mess_id,year_month) DO UPDATE SET
           updated_at=excluded.updated_at`,
        userId,
        messId,
        yearMonth,
        null,
        Date.now(),
      );
    });
  }
  async acknowledge(
    operationId: string,
    userId: number,
    messId: number,
    p: { yearMonth: string; consumerId: string; day: number; count: number },
  ): Promise<void> {
    const entityId = `${p.yearMonth}:${p.consumerId}:${p.day}`;
    // One transaction with the sibling check, so an edit queued while this
    // one was in flight cannot slip in between and keep a stale base.
    await runInTransaction(this.db, async () => {
      const pending = await this.db.getAllAsync<{
        id: string;
        payload: string;
      }>(
        `SELECT id,payload FROM offline_outbox
         WHERE user_id=? AND mess_id=? AND entity_type='daily_meal'
           AND entity_id=? AND id<>?`,
        userId,
        messId,
        entityId,
        operationId,
      );
      if (pending.length > 0) {
        await this.db.runAsync(
          "UPDATE local_daily_meals SET base_count=?,is_dirty=1,sync_state=1,updated_at=? WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
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
        return;
      }
      await this.db.runAsync(
        "UPDATE local_daily_meals SET count=?,base_count=?,is_dirty=1,sync_state=2,conflict_message=NULL,updated_at=? WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
        p.count,
        p.count,
        Date.now(),
        userId,
        messId,
        p.yearMonth,
        p.consumerId,
        p.day,
      );
    });
  }
  /** The server holds a value this device sent earlier: retry on top of it. */
  async rebase(
    operationId: string,
    userId: number,
    messId: number,
    p: { yearMonth: string; consumerId: string; day: number },
    serverCount: number,
  ): Promise<void> {
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        "UPDATE local_daily_meals SET base_count=? WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
        serverCount,
        userId,
        messId,
        p.yearMonth,
        p.consumerId,
        p.day,
      );
      const row = await this.db.getFirstAsync<{ payload: string }>(
        "SELECT payload FROM offline_outbox WHERE id=?",
        operationId,
      );
      if (!row) return;
      await this.db.runAsync(
        "UPDATE offline_outbox SET payload=?,updated_at=? WHERE id=?",
        JSON.stringify({
          ...(JSON.parse(row.payload) as Record<string, unknown>),
          baseCount: serverCount,
          sentCounts: [],
        }),
        Date.now(),
        operationId,
      );
    });
  }
  async markConflict(
    userId: number,
    messId: number,
    p: { yearMonth: string; consumerId: string; day: number },
    message: string,
    serverCount: number,
  ): Promise<void> {
    await this.db.runAsync(
      "UPDATE local_daily_meals SET conflict_message=?,base_count=?,is_dirty=1,sync_state=1 WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
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
  /** Conflicts for one month, or across every month when none is given. */
  async getConflicts(
    userId: number,
    messId: number,
    yearMonth?: string,
  ): Promise<DailyMealConflict[]> {
    const rows = await this.db.getAllAsync<{
      year_month: string;
      consumer_id: string;
      day: number;
      count: number;
      base_count: number;
      conflict_message: string;
    }>(
      `SELECT year_month,consumer_id,day,count,base_count,conflict_message FROM local_daily_meals WHERE user_id=? AND mess_id=? ${
        yearMonth ? "AND year_month=? " : ""
      }AND conflict_message IS NOT NULL ORDER BY year_month,day,consumer_id`,
      ...(yearMonth ? [userId, messId, yearMonth] : [userId, messId]),
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
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        "UPDATE local_daily_meals SET count=base_count,is_dirty=0,sync_state=0,conflict_message=NULL,updated_at=? WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",
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
