import type { SQLiteDatabase } from "expo-sqlite";

import { registerReferenceSync } from "../features/reference/registerReferenceSync";
import { SyncRegistry } from "./registry";

/**
 * Central registration point for feature-specific push processors and pullers.
 * Each feature will own its adapter; this file only composes them.
 */
export function createSyncRegistry(database: SQLiteDatabase): SyncRegistry {
  const registry = new SyncRegistry();

  registerReferenceSync(registry, database);

  return registry;
}
