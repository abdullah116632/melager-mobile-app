import type { SQLiteDatabase } from "expo-sqlite";

import { OutboxRepository } from "../repositories/outboxRepository";
import { SyncStateRepository } from "../repositories/syncStateRepository";
import { SyncRegistry } from "./registry";
import type { SyncContext, SyncSummary } from "./types";

const MAX_BACKOFF_MS = 5 * 60 * 1000;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown sync error";

const nextRetryAt = (attemptCount: number): number => {
  const delay = Math.min(
    1_000 * 2 ** Math.min(attemptCount, 8),
    MAX_BACKOFF_MS,
  );
  return Date.now() + delay;
};

export class SyncEngine {
  private readonly outbox: OutboxRepository;
  private readonly syncState: SyncStateRepository;
  private activeSync: Promise<SyncSummary> | null = null;

  constructor(
    database: SQLiteDatabase,
    private readonly registry: SyncRegistry,
  ) {
    this.outbox = new OutboxRepository(database);
    this.syncState = new SyncStateRepository(database);
  }

  sync(context: SyncContext): Promise<SyncSummary> {
    if (this.activeSync) return this.activeSync;
    this.activeSync = this.run(context).finally(() => {
      this.activeSync = null;
    });
    return this.activeSync;
  }

  private async run(context: SyncContext): Promise<SyncSummary> {
    const summary: SyncSummary = {
      pushed: 0,
      pulledCollections: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
    };
    const operations = await this.outbox.listReady(
      context.userId,
      context.messId,
    );

    // Preserve creation order until individual feature contracts explicitly
    // declare that their mutations are safe to parallelize.
    for (const operation of operations) {
      const processor = this.registry.getProcessor(operation.entityType);
      if (!processor) {
        summary.skipped += 1;
        continue;
      }

      await this.outbox.markSyncing(operation.id);
      try {
        await processor(operation, context);
        await this.outbox.removeSynced(operation.id);
        summary.pushed += 1;
      } catch (error) {
        await this.outbox.markFailed(
          operation.id,
          errorMessage(error),
          nextRetryAt(operation.attemptCount),
        );
        summary.failed += 1;
        // Preserve mutation causality. A later operation may depend on the
        // failed one, so the next sync pass resumes from this point.
        break;
      }
    }

    for (const [collection, pull] of this.registry.getPullers()) {
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
    return summary;
  }
}
