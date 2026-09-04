export type OutboxOperationKind =
  "create" | "update" | "delete" | "upsert" | "command";

export type OutboxStatus = "pending" | "syncing" | "failed";

export interface OutboxOperation<TPayload = unknown> {
  id: string;
  dedupeKey: string;
  userId: number;
  messId: number | null;
  entityType: string;
  entityId: string;
  operation: OutboxOperationKind;
  payload: TPayload;
  baseVersion: number | null;
  status: OutboxStatus;
  attemptCount: number;
  nextAttemptAt: number;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface EnqueueOperationInput<TPayload = unknown> {
  id?: string;
  dedupeKey?: string;
  userId: number;
  messId?: number | null;
  entityType: string;
  entityId: string;
  operation: OutboxOperationKind;
  payload: TPayload;
  baseVersion?: number | null;
}
