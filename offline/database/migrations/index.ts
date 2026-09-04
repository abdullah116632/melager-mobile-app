import type { SQLiteDatabase } from "expo-sqlite";

import { OFFLINE_DATABASE_VERSION } from "../constants";
import { offlineInfrastructureMigration } from "./001-offline-infrastructure";
import type { DatabaseMigration } from "./types";

const migrations: DatabaseMigration[] = [offlineInfrastructureMigration];

type UserVersionRow = { user_version: number };

export async function runDatabaseMigrations(
  database: SQLiteDatabase,
): Promise<void> {
  const versionRow = await database.getFirstAsync<UserVersionRow>(
    "PRAGMA user_version",
  );
  const currentVersion = Number(versionRow?.user_version ?? 0);

  if (currentVersion > OFFLINE_DATABASE_VERSION) {
    throw new Error(
      `Local database version ${currentVersion} is newer than supported version ${OFFLINE_DATABASE_VERSION}.`,
    );
  }

  const pendingMigrations = migrations.filter(
    (migration) => migration.version > currentVersion,
  );

  for (const migration of pendingMigrations) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migration.sql);
      await database.runAsync(
        `INSERT INTO schema_migrations (version, name, applied_at)
         VALUES (?, ?, ?)`,
        migration.version,
        migration.name,
        Date.now(),
      );
      await database.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
