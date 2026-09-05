import type { SQLiteDatabase } from "expo-sqlite";

import { ApiError } from "@/lib/api";

import { OutboxRepository } from "../repositories/outboxRepository";
import { SyncStateRepository } from "../repositories/syncStateRepository";
import { SyncRegistry } from "./registry";
import type { SyncContext, SyncOptions, SyncSummary } from "./types";

const MAX_BACKOFF_MS = 5 * 60 * 1000;
const OUTBOX_BATCH_SIZE = 50;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown sync error";

const nextRetryAt = (attemptCount: number): number => {
  const delay = Math.min(
    1_000 * 2 ** Math.min(attemptCount, 8),
    MAX_BACKOFF_MS,
  );
  return Date.now() + delay;
};

const permanentHttpStatus = (error: unknown): number | null => {
  if (!(error instanceof ApiError)) return null;
  return error.status >= 400 &&
    error.status < 500 &&
    ![408, 425, 429].includes(error.status)
    ? error.status
    : null;
};

const contextKey = (context: SyncContext): string =>
  `${context.userId}:${context.messId ?? "global"}`;

export class SyncEngine {
  private readonly outbox: OutboxRepository;
  private readonly syncState: SyncStateRepository;
  private activeSync: {
    promise: Promise<SyncSummary>;
    collections: Set<string> | null;
    contextKey: string;
  } | null = null;
  private readonly retryTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private suspended = false;

  constructor(
    database: SQLiteDatabase,
    private readonly registry: SyncRegistry,
  ) {
    this.outbox = new OutboxRepository(database);
    this.syncState = new SyncStateRepository(database);
  }

  sync(context: SyncContext, options: SyncOptions = {}): Promise<SyncSummary> {
    if (this.suspended) {
      return Promise.resolve({
        pushed: 0,
        pulledCollections: 0,
        failed: 0,
        skipped: 0,
        pending: 0,
      });
    }
    const requestedContextKey = contextKey(context);
    const requested = options.collections?.length
      ? new Set(options.collections)
      : null;
    if (this.activeSync) {
      const runAfterActive = () =>
        this.sync(context, { ...options, force: false });
      if (options.force || this.activeSync.contextKey !== requestedContextKey) {
        return this.activeSync.promise.then(runAfterActive, runAfterActive);
      }
      const activeCanSatisfy =
        this.activeSync.collections === null ||
        (requested !== null &&
          [...requested].every((collection) =>
            this.activeSync!.collections?.has(collection),
          ));
      if (activeCanSatisfy) return this.activeSync.promise;
      return this.activeSync.promise.then(runAfterActive, runAfterActive);
    }
    const promise = this.run(context, requested).finally(() => {
      if (this.activeSync?.promise === promise) this.activeSync = null;
    });
    this.activeSync = {
      promise,
      collections: requested,
      contextKey: requestedContextKey,
    };
    return promise;
  }

  cancelScheduled(context: Pick<SyncContext, "userId" | "messId">): void {
    const key = `${context.userId}:${context.messId ?? "global"}`;
    const timer = this.retryTimers.get(key);
    if (timer) clearTimeout(timer);
    this.retryTimers.delete(key);
  }

  /** Prevents new work and waits until an in-flight run can no longer write. */
  async suspendAndDrain(): Promise<void> {
    this.suspended = true;
    for (const timer of this.retryTimers.values()) clearTimeout(timer);
    this.retryTimers.clear();
    await this.activeSync?.promise.catch(() => undefined);
  }

  resume(): void {
    this.suspended = false;
  }

  private async run(
    context: SyncContext,
    collections: Set<string> | null,
  ): Promise<SyncSummary> {
    const summary: SyncSummary = {
      pushed: 0,
      pulledCollections: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
    };
    await this.outbox.recoverInterruptedSyncs(context.userId, context.messId);
    // Keep taking bounded SQLite batches until every currently-ready mutation
    // has been handled. Failed transient rows get a future next_attempt_at and
    // therefore cannot make this loop spin.
    while (true) {
      const operations = await this.outbox.listReady(
        context.userId,
        context.messId,
        OUTBOX_BATCH_SIZE,
      );
      if (operations.length === 0) break;

      for (const operation of operations) {
        const processor = this.registry.getProcessor(operation.entityType);
        if (!processor) {
          await this.outbox.moveToDeadLetter(
            operation.id,
            `No sync processor is registered for ${operation.entityType}.`,
            null,
          );
          summary.skipped += 1;
          continue;
        }

        await this.outbox.markSyncing(operation.id);
        try {
          await processor(operation, {
            ...context,
            messId: operation.messId,
          });
          await this.outbox.removeSynced(operation.id);
          summary.pushed += 1;
        } catch (error) {
          const status = permanentHttpStatus(error);
          if (status !== null) {
            await this.outbox.moveToDeadLetter(
              operation.id,
              errorMessage(error),
              status,
            );
          } else {
            await this.outbox.markFailed(
              operation.id,
              errorMessage(error),
              nextRetryAt(operation.attemptCount),
            );
          }
          summary.failed += 1;
        }
      }
    }

    for (const [collection, pull] of this.registry.getPullers()) {
      if (collections !== null && !collections.has(collection)) continue;
      const previous = await this.syncState.get(context, collection);
      try {
        const result = await pull(previous?.cursor ?? null, context);
        await this.syncState.saveSuccess(context, collection, result.cursor);
        summary.pulledCollections += 1;
      } catch (error) {
        await this.syncState.saveFailure(
          context,
          collection,
          errorMessage(error),
        );
        summary.failed += 1;
      }
    }

    summary.pending = await this.outbox.countPending(
      context.userId,
      context.messId,
    );
    await this.scheduleNextRetry(context, collections);
    return summary;
  }

  private async scheduleNextRetry(
    context: SyncContext,
    collections: Set<string> | null,
  ): Promise<void> {
    if (this.suspended) return;
    this.cancelScheduled(context);
    const retryAt = await this.outbox.getNextAttemptAt(
      context.userId,
      context.messId,
    );
    if (retryAt === null) return;

    const key = contextKey(context);
    const delay = Math.max(0, retryAt - Date.now());
    const timer = setTimeout(() => {
      this.retryTimers.delete(key);
      void this.sync(context, {
        collections: collections ? [...collections] : undefined,
        force: true,
      }).catch(() => undefined);
    }, delay);
    this.retryTimers.set(key, timer);
  }
}
