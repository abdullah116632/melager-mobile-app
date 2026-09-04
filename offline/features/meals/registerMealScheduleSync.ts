import type { SQLiteDatabase } from "expo-sqlite";
import { api } from "@/lib/api";
import type { OutboxOperation } from "../../outbox/types";
import type { SyncRegistry } from "../../sync/registry";
import { MealScheduleRepository } from "./MealScheduleRepository";
import type { MealScheduleMutation } from "./types";

export function registerMealScheduleSync(registry: SyncRegistry, database: SQLiteDatabase): void {
  const repository = new MealScheduleRepository(database);
  registry.registerProcessor("meal_schedule", async (operation, context) => {
    const payload = operation.payload as MealScheduleMutation;
    if (!payload.schedule) throw new Error("Meal schedule payload is missing.");
    await api.setMealSchedule({ messId: context.messId!, date: payload.date, ...payload.schedule }, context.token);
    await repository.markSynced(context.userId, context.messId!, payload.date);
  });
  registry.registerProcessor("meal_opt_out", async (operation, context) => {
    const payload = operation.payload as MealScheduleMutation;
    if (!payload.mealType || payload.scope === undefined) throw new Error("Meal opt-out payload is invalid.");
    await api.toggleMealOptOut(context.messId!, payload.date, payload.mealType, payload.scope, context.token);
    await repository.markSynced(context.userId, context.messId!, payload.date);
  });
  registry.registerPuller("meal_schedule", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    const date = new Date().toISOString().slice(0, 10);
    const [schedule, optOuts] = await Promise.all([
      api.getTodaySchedule(context.messId, context.token, date),
      api.getMealOptOuts(context.messId, date, context.token),
    ]);
    await repository.replaceRemoteSnapshot(context.userId, context.messId, date, schedule, optOuts.consumers);
    return { cursor: null };
  });
}
