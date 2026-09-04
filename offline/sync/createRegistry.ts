import { SyncRegistry } from "./registry";

/**
 * Central registration point for feature-specific push processors and pullers.
 * Each feature will own its adapter; this file only composes them.
 */
export function createSyncRegistry(): SyncRegistry {
  const registry = new SyncRegistry();

  // Feature adapters are registered here as individual screens move from the
  // legacy AsyncStorage queue to SQLite.

  return registry;
}
