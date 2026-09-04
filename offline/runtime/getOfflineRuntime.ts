import type { SQLiteDatabase } from "expo-sqlite";

import { OutboxRepository } from "../repositories/outboxRepository";
import { SyncEngine } from "../sync/SyncEngine";
import { createSyncRegistry } from "../sync/createRegistry";
import type { SyncRegistry } from "../sync/registry";

export interface OfflineRuntime {
  engine: SyncEngine;
  outbox: OutboxRepository;
  registry: SyncRegistry;
}

const runtimes = new WeakMap<SQLiteDatabase, OfflineRuntime>();

export function getOfflineRuntime(database: SQLiteDatabase): OfflineRuntime {
  const existing = runtimes.get(database);
  if (existing) return existing;

  const registry = createSyncRegistry();
  const runtime: OfflineRuntime = {
    registry,
    engine: new SyncEngine(database, registry),
    outbox: new OutboxRepository(database),
  };
  runtimes.set(database, runtime);
  return runtime;
}
