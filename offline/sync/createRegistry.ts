import type { SQLiteDatabase } from "expo-sqlite";

import { registerBazarSync } from "../features/bazar/registerBazarSync";
import { registerReferenceSync } from "../features/reference/registerReferenceSync";
import { registerNoticeSync } from "../features/notices/registerNoticeSync";
import { registerMealScheduleSync } from "../features/meals/registerMealScheduleSync";
import { registerDailyMealsSync } from "../features/dailyMeals/registerDailyMealsSync";
import { registerDepositSync } from "../features/deposits/registerDepositSync";
import { registerExpenseSync } from "../features/expenses/registerExpenseSync";
import { SyncRegistry } from "./registry";

/**
 * Central registration point for feature-specific push processors and pullers.
 * Each feature will own its adapter; this file only composes them.
 */
export function createSyncRegistry(database: SQLiteDatabase): SyncRegistry {
  const registry = new SyncRegistry();

  registerReferenceSync(registry, database);
  registerBazarSync(registry, database);
  registerNoticeSync(registry, database);
  registerMealScheduleSync(registry, database);
  registerDailyMealsSync(registry, database);
  registerDepositSync(registry, database);
  registerExpenseSync(registry, database);

  return registry;
}
