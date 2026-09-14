import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

export type SyncRejectionScope = "bazar" | "notices" | "meals" | "expenses";

export interface SyncRejection {
  id: string;
  message: string;
  createdAt: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();

export const subscribeToSyncRejections = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const emitSyncRejectionsChanged = (): void => {
  for (const listener of listeners) listener();
};

/** Changes the server turned down, kept until the admin has seen why. */
export class SyncRejectionRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  /** Adds a message unless the same one is already waiting to be seen. */
  async add(
    userId: number,
    messId: number,
    scope: SyncRejectionScope,
    message: string,
  ): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO local_sync_rejections
         (id, user_id, mess_id, scope, message, created_at)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (
         SELECT 1 FROM local_sync_rejections
         WHERE user_id = ? AND mess_id = ? AND scope = ? AND message = ?
       )`,
      Crypto.randomUUID(),
      userId,
      messId,
      scope,
      message,
      Date.now(),
      userId,
      messId,
      scope,
      message,
    );
    emitSyncRejectionsChanged();
  }

  async list(
    userId: number,
    messId: number,
    scope: SyncRejectionScope,
  ): Promise<SyncRejection[]> {
    const rows = await this.db.getAllAsync<{
      id: string;
      message: string;
      created_at: number;
    }>(
      `SELECT id, message, created_at FROM local_sync_rejections
       WHERE user_id = ? AND mess_id = ? AND scope = ?
       ORDER BY created_at`,
      userId,
      messId,
      scope,
    );
    return rows.map((row) => ({
      id: row.id,
      message: row.message,
      createdAt: Number(row.created_at),
    }));
  }

  async dismiss(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db.runAsync(
      `DELETE FROM local_sync_rejections WHERE id IN (${ids
        .map(() => "?")
        .join(", ")})`,
      ...ids,
    );
    emitSyncRejectionsChanged();
  }
}
