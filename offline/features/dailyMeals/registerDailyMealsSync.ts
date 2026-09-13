import type { SQLiteDatabase } from "expo-sqlite";
import { api, ApiError, clearApiCache } from "@/lib/api";
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
      sentCounts?: number[];
    };
    const { sentCounts = [], ...mutation } = payload;
    try {
      // The server only applies the count if the cell still holds baseCount,
      // so an edit made on another device meanwhile is reported, not lost.
      await api.syncDailyMeal(
        operation.id,
        context.messId!,
        mutation,
        context.token,
      );
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.status === 404 && !error.hasErrorBody) {
        // A server without the sync route: fall back to the plain write.
        await api.setMeal(
          payload.consumerId,
          payload.yearMonth,
          payload.day,
          payload.count,
          context.token,
          context.messId!,
        );
      } else if (error.status === 409) {
        clearApiCache();
        const month = await api.getMonthData(
          payload.yearMonth,
          context.token,
          context.messId!,
        );
        // Servers may omit zero-valued cells.
        const serverCount = Number(
          month.meals[payload.consumerId]?.[String(payload.day)] ?? 0,
        );
        if (serverCount !== payload.count) {
          if (serverCount === payload.baseCount) {
            // Nobody changed the cell: an earlier attempt of this same
            // mutation is still completing server-side.
            throw new Error("Meal update is still being confirmed.");
          }
          if (sentCounts.includes(serverCount)) {
            // The server holds this device's own earlier value.
            await repository.rebase(
              operation.id,
              context.userId,
              context.messId!,
              payload,
              serverCount,
            );
            throw new Error("Meal update is retrying on the confirmed value.");
          }
          await repository.markConflict(
            context.userId,
            context.messId!,
            payload,
            error.message,
            serverCount,
          );
          return;
        }
      } else {
        throw error;
      }
    }
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
