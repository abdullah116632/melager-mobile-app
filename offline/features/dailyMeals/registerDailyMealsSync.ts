import type { SQLiteDatabase } from "expo-sqlite";
import { api, ApiError, clearApiCache } from "@/lib/api";
import { SyncRejectionRepository } from "../../repositories/syncRejectionRepository";
import type { SyncRegistry } from "../../sync/registry";
import { DailyMealsRepository } from "./DailyMealsRepository";

const formatDay = (yearMonth: string, day: number) =>
  new Date(
    `${yearMonth}-${String(day).padStart(2, "0")}T00:00:00`,
  ).toLocaleDateString("en-US", { day: "numeric", month: "short" });

/** A refusal that retrying cannot fix; the sync engine dead-letters these. */
const isRejection = (error: ApiError) =>
  error.status >= 400 &&
  error.status < 500 &&
  ![401, 408, 409, 425, 429].includes(error.status);

export const registerDailyMealsSync = (
  registry: SyncRegistry,
  database: SQLiteDatabase,
) => {
  const repository = new DailyMealsRepository(database);
  const rejections = new SyncRejectionRepository(database);
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
        if (isRejection(error)) {
          // The change is dropped; the next pull restores the server value,
          // so tell the admin why their edit did not stay.
          let message: string;
          if (error.status === 403) {
            message =
              "Your meal changes were not saved: you no longer have admin access to this mess.";
          } else {
            const name =
              (await repository.consumerName(
                context.messId!,
                payload.consumerId,
              )) ?? "A member";
            const when = formatDay(payload.yearMonth, payload.day);
            message =
              error.status === 404
                ? `${name}'s meal on ${when} was not saved: this member is no longer in the mess.`
                : `${name}'s meal on ${when} was not saved: ${error.message}.`;
          }
          await rejections.add(
            context.userId,
            context.messId!,
            "meals",
            message,
          );
        }
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
    await repository.releaseOrphanedEdits(context.userId, context.messId);
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
