import type { SQLiteDatabase } from "expo-sqlite";
import { api } from "@/lib/api";
import type { OutboxOperation } from "../../outbox/types";
import type { SyncRegistry } from "../../sync/registry";
import { MealScheduleRepository } from "./MealScheduleRepository";
import type { MealScheduleMutation } from "./types";
import { getDhakaDate } from "@/utils/dashboard";

export function registerMealScheduleSync(
  registry: SyncRegistry,
  database: SQLiteDatabase,
): void {
  const repository = new MealScheduleRepository(database);
  registry.registerProcessor("meal_schedule", async (operation, context) => {
    const payload = operation.payload as MealScheduleMutation;
    if (!payload.schedule) throw new Error("Meal schedule payload is missing.");
    await api.setMealScheduleV2(
      { messId: context.messId!, date: payload.date, ...payload.schedule },
      context.token,
    );
    await repository.markSynced(
      operation.id,
      context.userId,
      context.messId!,
      payload.date,
    );
  });
  registry.registerProcessor("meal_opt_out", async (operation, context) => {
    const payload = operation.payload as MealScheduleMutation;
    if (
      !payload.mealType ||
      payload.scope === undefined ||
      payload.isOptedOut === undefined
    )
      throw new Error("Meal opt-out payload is invalid.");
    await api.toggleMealOptOutV2(
      context.messId!,
      payload.date,
      payload.mealType,
      payload.scope,
      context.token,
      payload.isOptedOut,
    );
    await repository.markSynced(
      operation.id,
      context.userId,
      context.messId!,
      payload.date,
    );
  });
  registry.registerPuller("meal_schedule", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    const date = getDhakaDate();
    const schedule = await api.getMealStatusDayV2(
      context.messId,
      context.token,
      date,
    );
    await repository.replaceRemoteSnapshot(
      context.userId,
      context.messId,
      date,
      schedule,
      schedule.consumers ?? [],
    );
    return { cursor: null };
  });
}
