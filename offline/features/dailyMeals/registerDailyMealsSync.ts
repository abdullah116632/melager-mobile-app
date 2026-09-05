import type { SQLiteDatabase } from "expo-sqlite";
import { api, ApiError } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { DailyMealsRepository } from "./DailyMealsRepository";

export const registerDailyMealsSync = (
  registry: SyncRegistry,
  database: SQLiteDatabase,
) => {
  const repository = new DailyMealsRepository(database);
  registry.registerProcessor("daily_meal", async (operation, context) => {
    const payload = operation.payload as {
      yearMonth: string;
      consumerId: string;
      day: number;
      count: number;
      baseCount: number;
    };
    // Meals use explicit last-write-wins semantics: the device whose request
    // reaches the server last owns the final cell value. The queued payload is
    // already deduplicated per cell, so this sends exactly the last local
    // value instead of rejecting it for a stale base count.
    await api.setMeal(
      payload.consumerId,
      payload.yearMonth,
      payload.day,
      payload.count,
      context.token,
      context.messId!,
    );
    await repository.acknowledge(
      operation.id,
      context.userId,
      context.messId!,
      payload,
    );
  });
  registry.registerPuller("daily_meals", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    const months = await repository.getTrackedMonths(
      context.userId,
      context.messId,
    );
    for (const month of months) {
      if (month.cursor === null || month.cursor === "legacy") {
        const remoteRequestStartedAt = Date.now();
        const data = await api.getMonthData(
          month.yearMonth,
          context.token,
          context.messId,
        );
        await repository.mergeRemote(
          context.userId,
          context.messId,
          month.yearMonth,
          data.meals,
          remoteRequestStartedAt,
          true,
        );
        if (month.cursor === "legacy") continue;
      }
      try {
        const result = await api.getDailyMealChanges(
          context.messId,
          month.yearMonth,
          month.cursor,
          context.token,
        );
        await repository.applyChanges(
          context.userId,
          context.messId,
          month.yearMonth,
          result.changes.map((change) => change.payload),
          result.cursor,
        );
      } catch (error) {
        // Legacy deployments have no incremental changes endpoint. The full
        // snapshot above is enough and is safer than treating the pull as a
        // failed sync forever.
        if (
          error instanceof ApiError &&
          error.status === 404 &&
          error.path?.startsWith("/mess/daily-meals/changes")
        ) {
          await repository.applyChanges(
            context.userId,
            context.messId,
            month.yearMonth,
            [],
            "legacy",
          );
          continue;
        }
        throw error;
      }
    }
    return { cursor: null };
  });
};
