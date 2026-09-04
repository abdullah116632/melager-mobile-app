import type { SQLiteDatabase } from "expo-sqlite";

import { registerBazarSync } from "../features/bazar/registerBazarSync";
import { registerReferenceSync } from "../features/reference/registerReferenceSync";
import { registerNoticeSync } from "../features/notices/registerNoticeSync";
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

  return registry;
}
