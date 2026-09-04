import type { SQLiteDatabase } from "expo-sqlite";

export declare class OfflineDatabaseUnavailableError extends Error {
  constructor(message: string);
}

export declare const isOfflineDatabaseSupported: () => boolean;

export declare function getOfflineDatabase(): Promise<SQLiteDatabase>;

