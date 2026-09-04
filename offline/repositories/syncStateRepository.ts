import type { SQLiteDatabase } from "expo-sqlite";

export interface SyncScope {
  userId: number;
  messId: number | null;
}

export interface SyncState extends SyncScope {
  collection: string;
  cursor: string | null;
  lastSyncedAt: number | null;
  lastError: string | null;
}

interface SyncStateRow {
  user_id: number;
  mess_id: number | null;
  collection: string;
  cursor: string | null;
  last_synced_at: number | null;
  last_error: string | null;
}

const scopeKey = (scope: SyncScope, collection: string): string =>
  `${scope.userId}:${scope.messId ?? "global"}:${collection}`;

export class SyncStateRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async get(scope: SyncScope, collection: string): Promise<SyncState | null> {
    const row = await this.database.getFirstAsync<SyncStateRow>(
      "SELECT * FROM sync_state WHERE scope_key = ?",
      scopeKey(scope, collection),
    );
    if (!row) return null;
    return {
      userId: row.user_id,
      messId: row.mess_id,
      collection: row.collection,
      cursor: row.cursor,
      lastSyncedAt: row.last_synced_at,
      lastError: row.last_error,
    };
  }

  async saveSuccess(
    scope: SyncScope,
    collection: string,
    cursor: string | null,
  ): Promise<void> {
    const now = Date.now();
    await this.database.runAsync(
      `INSERT INTO sync_state (
        scope_key, user_id, mess_id, collection, cursor,
        last_synced_at, last_error, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
      ON CONFLICT(scope_key) DO UPDATE SET
        cursor = excluded.cursor,
        last_synced_at = excluded.last_synced_at,
        last_error = NULL,
        updated_at = excluded.updated_at`,
      scopeKey(scope, collection),
      scope.userId,
      scope.messId,
      collection,
      cursor,
      now,
      now,
    );
  }

  async saveFailure(
    scope: SyncScope,
    collection: string,
    error: string,
  ): Promise<void> {
    const now = Date.now();
    await this.database.runAsync(
      `INSERT INTO sync_state (
        scope_key, user_id, mess_id, collection, cursor,
        last_synced_at, last_error, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)
      ON CONFLICT(scope_key) DO UPDATE SET
        last_error = excluded.last_error,
        updated_at = excluded.updated_at`,
      scopeKey(scope, collection),
      scope.userId,
      scope.messId,
      collection,
      error,
      now,
    );
  }
}
