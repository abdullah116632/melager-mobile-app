import type { SQLiteDatabase } from "expo-sqlite";

import { runDatabaseMigrations } from "./migrations";

export async function initializeOfflineDatabase(
  database: SQLiteDatabase,
): Promise<void> {
  // WAL allows reads to continue while a write is being committed. This is
  // important once larger feature tables begin syncing in the background.
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  await runDatabaseMigrations(database);

  // A terminated app may leave an operation marked as syncing. It is safe to
  // retry because future server mutations must use the outbox id as their
  // idempotency key.
  await database.runAsync(
    `UPDATE offline_outbox
     SET status = 'pending', updated_at = ?
     WHERE status = 'syncing'`,
    Date.now(),
  );
}
