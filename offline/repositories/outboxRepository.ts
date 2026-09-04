import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type {
  EnqueueOperationInput,
  OutboxOperation,
  OutboxOperationKind,
  OutboxStatus,
} from "../outbox/types";

interface OutboxRow {
  id: string;
  dedupe_key: string;
  user_id: number;
  mess_id: number | null;
  entity_type: string;
  entity_id: string;
  operation: OutboxOperationKind;
  payload: string;
  base_version: number | null;
  status: OutboxStatus;
  attempt_count: number;
  next_attempt_at: number;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

const toOperation = (row: OutboxRow): OutboxOperation => ({
  id: row.id,
  dedupeKey: row.dedupe_key,
  userId: row.user_id,
  messId: row.mess_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  operation: row.operation,
  payload: JSON.parse(row.payload) as unknown,
  baseVersion: row.base_version,
  status: row.status,
  attemptCount: row.attempt_count,
  nextAttemptAt: row.next_attempt_at,
  lastError: row.last_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class OutboxRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async enqueue<TPayload>(
    input: EnqueueOperationInput<TPayload>,
  ): Promise<OutboxOperation<TPayload>> {
    const id = input.id ?? Crypto.randomUUID();
    const dedupeKey = input.dedupeKey ?? id;
    const now = Date.now();
    const payload = JSON.stringify(input.payload ?? null);

    await this.database.runAsync(
      `INSERT INTO offline_outbox (
        id, dedupe_key, user_id, mess_id, entity_type, entity_id,
        operation, payload, base_version, status, attempt_count,
        next_attempt_at, last_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, NULL, ?, ?)
      ON CONFLICT(user_id, dedupe_key) DO UPDATE SET
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        operation = excluded.operation,
        payload = excluded.payload,
        base_version = excluded.base_version,
        status = 'pending',
        attempt_count = 0,
        next_attempt_at = 0,
        last_error = NULL,
        updated_at = excluded.updated_at`,
      id,
      dedupeKey,
      input.userId,
      input.messId ?? null,
      input.entityType,
      input.entityId,
      input.operation,
      payload,
      input.baseVersion ?? null,
      now,
      now,
    );

    const saved = await this.database.getFirstAsync<OutboxRow>(
      `SELECT * FROM offline_outbox
       WHERE user_id = ? AND dedupe_key = ?`,
      input.userId,
      dedupeKey,
    );
    if (!saved) throw new Error("Could not persist the offline operation.");
    return toOperation(saved) as OutboxOperation<TPayload>;
  }

  async listReady(
    userId: number,
    messId: number | null,
    limit = 50,
    now = Date.now(),
  ): Promise<OutboxOperation[]> {
    const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
    const rows = await this.database.getAllAsync<OutboxRow>(
      `SELECT * FROM offline_outbox
       WHERE user_id = ?
         AND mess_id IS ?
         AND status IN ('pending', 'failed')
         AND next_attempt_at <= ?
       ORDER BY created_at ASC
       LIMIT ?`,
      userId,
      messId,
      now,
      safeLimit,
    );
    return rows.map(toOperation);
  }

  async countPending(userId: number, messId: number | null): Promise<number> {
    const row = await this.database.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM offline_outbox
       WHERE user_id = ? AND mess_id IS ?`,
      userId,
      messId,
    );
    return Number(row?.total ?? 0);
  }

  async markSyncing(id: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE offline_outbox
       SET status = 'syncing', updated_at = ?
       WHERE id = ?`,
      Date.now(),
      id,
    );
  }

  async removeSynced(id: string): Promise<void> {
    await this.database.runAsync("DELETE FROM offline_outbox WHERE id = ?", id);
  }

  async markFailed(
    id: string,
    error: string,
    nextAttemptAt: number,
  ): Promise<void> {
    await this.database.runAsync(
      `UPDATE offline_outbox
       SET status = 'failed',
           attempt_count = attempt_count + 1,
           next_attempt_at = ?,
           last_error = ?,
           updated_at = ?
       WHERE id = ?`,
      nextAttemptAt,
      error,
      Date.now(),
      id,
    );
  }
}
