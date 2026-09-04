import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import { OFFLINE_DATABASE_NAME } from "./constants";
import { initializeOfflineDatabase } from "./initialize";

let databasePromise: Promise<SQLiteDatabase> | null = null;

export class OfflineDatabaseUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfflineDatabaseUnavailableError";
  }
}

export const isOfflineDatabaseSupported = (): boolean => true;

export function getOfflineDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(OFFLINE_DATABASE_NAME)
      .then(async (database) => {
        await initializeOfflineDatabase(database);
        return database;
      })
      .catch((error) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
}
