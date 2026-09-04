import type { OutboxOperation } from "../outbox/types";
import type { SyncScope } from "../repositories/syncStateRepository";

export interface SyncContext extends SyncScope {
  // Authentication stays in memory and is supplied when syncing. It is never
  // persisted inside an outbox row.
  token: string;
}

export type OutboxProcessor = (
  operation: OutboxOperation,
  context: SyncContext,
) => Promise<void>;

export interface PullResult {
  cursor: string | null;
}

export type CollectionPuller = (
  cursor: string | null,
  context: SyncContext,
) => Promise<PullResult>;

export interface SyncSummary {
  pushed: number;
  pulledCollections: number;
  failed: number;
  skipped: number;
  pending: number;
}

export interface SyncOptions {
  /** Pull only these registered collections after pushing the outbox. */
  collections?: string[];
  /** Queue a follow-up run when another sync is already listing the outbox. */
  force?: boolean;
}
