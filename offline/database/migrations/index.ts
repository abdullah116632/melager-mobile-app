import type { SQLiteDatabase } from "expo-sqlite";

import { OFFLINE_DATABASE_VERSION } from "../constants";
import { offlineInfrastructureMigration } from "./001-offline-infrastructure";
import { referenceDataMigration } from "./002-reference-data";
import { bazarMigration } from "./003-bazar";
import { noticesMigration } from "./004-notices";
import { mealScheduleMigration } from "./005-meal-schedule";
import { dailyMealsMigration } from "./006-daily-meals";
import { dailyMealSyncStateMigration } from "./007-daily-meal-sync-state";
import { depositsMigration } from "./008-deposits";
import { expensesMigration } from "./009-expenses";
import { messagesMigration } from "./010-messages";
import type { DatabaseMigration } from "./types";

const migrations: DatabaseMigration[] = [
  offlineInfrastructureMigration,
  referenceDataMigration,
  bazarMigration,
  noticesMigration,
  mealScheduleMigration,
  dailyMealsMigration,
  dailyMealSyncStateMigration,
  depositsMigration,
  expensesMigration,
  messagesMigration,
];

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
