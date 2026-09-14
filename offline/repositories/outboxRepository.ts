import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import { runInTransaction } from "../database/transaction";
import { notifyOutboxChanged } from "../outbox/outboxChangeNotifier";
import type {
  DeadLetterOperation,
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

interface DeadLetterRow extends Omit<OutboxRow, "status" | "next_attempt_at"> {
  http_status: number | null;
  failed_at: number;
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

const toDeadLetter = (row: DeadLetterRow): DeadLetterOperation => ({
  id: row.id,
  dedupeKey: row.dedupe_key,
  userId: row.user_id,
  messId: row.mess_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  operation: row.operation,
  payload: JSON.parse(row.payload) as unknown,
  baseVersion: row.base_version,
  attemptCount: row.attempt_count,
  lastError: row.last_error ?? "Permanent sync failure",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  httpStatus: row.http_status,
  failedAt: row.failed_at,
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
        id = excluded.id,
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        operation = excluded.operation,
        payload = excluded.payload,
        base_version = excluded.base_version,
        status = 'pending',
        attempt_count = 0,
        next_attempt_at = 0,
        last_error = NULL,
        created_at = excluded.created_at,
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

    // A new edit with the same dedupe key is the user's resolution of an old
    // quarantined mutation; keep only the new active operation.
    await this.database.runAsync(
      `DELETE FROM offline_outbox_dead_letters
       WHERE user_id = ? AND dedupe_key = ?`,
      input.userId,
      dedupeKey,
    );

    const saved = await this.database.getFirstAsync<OutboxRow>(
      `SELECT * FROM offline_outbox
       WHERE user_id = ? AND dedupe_key = ?`,
      input.userId,
      dedupeKey,
    );
    if (!saved) throw new Error("Could not persist the offline operation.");
    notifyOutboxChanged();
    return toOperation(saved) as OutboxOperation<TPayload>;
  }

  async removeEntity(
    userId: number,
    messId: number | null,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await this.database.runAsync(
      `DELETE FROM offline_outbox
       WHERE user_id = ? AND mess_id IS ? AND entity_type = ? AND entity_id = ?`,
      userId,
      messId,
      entityType,
      entityId,
    );
    notifyOutboxChanged();
  }

  async getById(id: string): Promise<OutboxOperation | null> {
    const row = await this.database.getFirstAsync<OutboxRow>(
      "SELECT * FROM offline_outbox WHERE id = ?",
      id,
    );
    return row ? toOperation(row) : null;
  }

  /**
   * An operation handed to the network may have been applied server-side even
   * if its response never arrived, so it can no longer simply be dropped.
   */
  async getDeliveryState(
    userId: number,
    dedupeKey: string,
  ): Promise<"none" | "unsent" | "maybe-sent"> {
    const row = await this.database.getFirstAsync<{
      status: OutboxStatus;
      attempt_count: number;
    }>(
      `SELECT status, attempt_count FROM offline_outbox
       WHERE user_id = ? AND dedupe_key = ?`,
      userId,
      dedupeKey,
    );
    if (!row) return "none";
    return row.status === "syncing" || row.attempt_count > 0
      ? "maybe-sent"
      : "unsent";
  }

  /**
   * Ready operations for this account in every mess. Each operation carries
   * its own mess, so work done in one mess still syncs while another is open.
   */
  async listReady(
    userId: number,
    limit = 50,
    now = Date.now(),
  ): Promise<OutboxOperation[]> {
    const safeLimit = Math.max(1, Math.min(Math.trunc(limit), 100));
    const rows = await this.database.getAllAsync<OutboxRow>(
      `SELECT * FROM offline_outbox
       WHERE user_id = ?
         AND status IN ('pending', 'failed')
         AND next_attempt_at <= ?
       ORDER BY created_at ASC, rowid ASC
       LIMIT ?`,
      userId,
      now,
      safeLimit,
    );
    return rows.map(toOperation);
  }

  /**
   * A process can be suspended or killed after markSyncing() but before the
   * HTTP result is persisted. Such a row must be retried on the next runtime
   * instead of being permanently invisible to listReady().
   */
  async recoverInterruptedSyncs(userId: number): Promise<void> {
    await this.database.runAsync(
      // The interrupted attempt may have reached the server, so it counts.
      `UPDATE offline_outbox
       SET status = 'pending', attempt_count = attempt_count + 1,
           next_attempt_at = 0, updated_at = ?
       WHERE user_id = ? AND status = 'syncing'`,
      Date.now(),
      userId,
    );
  }

  /** Unsynced operations for this account across every mess. */
  async countAllPending(userId: number): Promise<number> {
    const row = await this.database.getFirstAsync<{ total: number }>(
      "SELECT COUNT(*) AS total FROM offline_outbox WHERE user_id = ?",
      userId,
    );
    return Number(row?.total ?? 0);
  }

  /** The mess scopes that still hold queued operations for this account. */
  async listPendingMessIds(userId: number): Promise<Array<number | null>> {
    const rows = await this.database.getAllAsync<{ mess_id: number | null }>(
      "SELECT DISTINCT mess_id FROM offline_outbox WHERE user_id = ?",
      userId,
    );
    return rows.map((row) => row.mess_id);
  }

  /** Lets an explicit "sync now" retry work that is waiting out a backoff. */
  async makeReadyNow(userId: number): Promise<void> {
    await this.database.runAsync(
      `UPDATE offline_outbox SET next_attempt_at = 0
       WHERE user_id = ? AND status IN ('pending', 'failed')`,
      userId,
    );
  }

  /** The newest failure for this scope, whether still retrying or quarantined. */
  async getLatestFailure(
    userId: number,
    messId: number | null,
  ): Promise<string | null> {
    const scopeClause =
      messId === null ? "mess_id IS NULL" : "(mess_id IS NULL OR mess_id = ?)";
    const parameters = messId === null ? [userId] : [userId, messId];
    const row = await this.database.getFirstAsync<{ message: string | null }>(
      `SELECT message FROM (
         SELECT last_error AS message, updated_at AS at FROM offline_outbox
          WHERE user_id = ? AND ${scopeClause} AND last_error IS NOT NULL
         UNION ALL
         SELECT last_error AS message, failed_at AS at
           FROM offline_outbox_dead_letters
          WHERE user_id = ? AND ${scopeClause}
       )
       ORDER BY at DESC LIMIT 1`,
      ...parameters,
      ...parameters,
    );
    return row?.message ?? null;
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
    notifyOutboxChanged();
  }

  /**
   * Holds an operation back until `at` without spending a delivery attempt.
   * Used to keep a queue behind an earlier operation that is still retrying.
   */
  async deferUntil(id: string, at: number): Promise<void> {
    await this.database.runAsync(
      `UPDATE offline_outbox
       SET next_attempt_at = ?, updated_at = ?
       WHERE id = ? AND next_attempt_at < ?`,
      at,
      Date.now(),
      id,
      at,
    );
  }

  /**
   * Puts an operation back as it was before this attempt. Used when the
   * request was refused before reaching the change (an expired session), so
   * it must not count as a delivery attempt.
   */
  async release(id: string, error: string): Promise<void> {
    await this.database.runAsync(
      `UPDATE offline_outbox
       SET status = 'pending', last_error = ?, updated_at = ?
       WHERE id = ?`,
      error,
      Date.now(),
      id,
    );
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

  /** The earliest retry time among this account's queued operations. */
  async getNextAttemptAt(userId: number): Promise<number | null> {
    const row = await this.database.getFirstAsync<{
      next_attempt_at: number | null;
    }>(
      `SELECT MIN(next_attempt_at) AS next_attempt_at
       FROM offline_outbox
       WHERE user_id = ? AND status IN ('pending', 'failed')`,
      userId,
    );
    return row?.next_attempt_at == null ? null : Number(row.next_attempt_at);
  }

  async moveToDeadLetter(
    id: string,
    error: string,
    httpStatus: number | null,
  ): Promise<void> {
    const now = Date.now();
    await runInTransaction(this.database, async () => {
      await this.database.runAsync(
        `INSERT OR REPLACE INTO offline_outbox_dead_letters (
          id, dedupe_key, user_id, mess_id, entity_type, entity_id,
          operation, payload, base_version, attempt_count, last_error,
          http_status, created_at, updated_at, failed_at
        )
        SELECT id, dedupe_key, user_id, mess_id, entity_type, entity_id,
          operation, payload, base_version, attempt_count + 1, ?, ?,
          created_at, ?, ?
        FROM offline_outbox WHERE id = ?`,
        error,
        httpStatus,
        now,
        now,
        id,
      );
      await this.database.runAsync(
        "DELETE FROM offline_outbox WHERE id = ?",
        id,
      );
    });
    notifyOutboxChanged();
  }

  async listDeadLetters(
    userId: number,
    messId: number | null,
  ): Promise<DeadLetterOperation[]> {
    const scopeClause =
      messId === null ? "mess_id IS NULL" : "(mess_id IS NULL OR mess_id = ?)";
    const parameters = messId === null ? [userId] : [userId, messId];
    const rows = await this.database.getAllAsync<DeadLetterRow>(
      `SELECT * FROM offline_outbox_dead_letters
       WHERE user_id = ? AND ${scopeClause}
       ORDER BY failed_at DESC`,
      ...parameters,
    );
    return rows.map(toDeadLetter);
  }

  async retryDeadLetter(id: string): Promise<void> {
    const now = Date.now();
    await runInTransaction(this.database, async () => {
      await this.database.runAsync(
        `INSERT INTO offline_outbox (
          id, dedupe_key, user_id, mess_id, entity_type, entity_id,
          operation, payload, base_version, status, attempt_count,
          next_attempt_at, last_error, created_at, updated_at
        )
        SELECT id, dedupe_key, user_id, mess_id, entity_type, entity_id,
          operation, payload, base_version, 'pending', 0, 0, NULL,
          created_at, ?
        FROM offline_outbox_dead_letters WHERE id = ?
        ON CONFLICT(user_id, dedupe_key) DO UPDATE SET
          payload = excluded.payload,
          base_version = excluded.base_version,
          status = 'pending',
          attempt_count = 0,
          next_attempt_at = 0,
          last_error = NULL,
          updated_at = excluded.updated_at`,
        now,
        id,
      );
      await this.database.runAsync(
        "DELETE FROM offline_outbox_dead_letters WHERE id = ?",
        id,
      );
    });
    notifyOutboxChanged();
  }

  async discardDeadLetter(id: string): Promise<void> {
    await this.database.runAsync(
      "DELETE FROM offline_outbox_dead_letters WHERE id = ?",
      id,
    );
  }
}
