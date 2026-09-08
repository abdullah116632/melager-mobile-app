import type { ApiBazarAssignment, ApiBazarItem, ApiConsumer } from "@/lib/api";

export interface BazarDateWindow {
  from: string;
  to: string;
}

export interface BazarSnapshot {
  items: ApiBazarItem[];
  assignments: ApiBazarAssignment[];
  unreadCount: number;
  pendingCount: number;
  savedAt: number;
}

export type BazarSyncOperation =
  | "item_create"
  | "item_update"
  | "item_status"
  | "item_delete"
  | "assignments_set"
  | "add_to_expense"
  | "notifications_read"
  | "notify_members";

export interface BazarMutationPayload {
  localId?: string;
  serverId?: number;
  /** Item, expense and notify operations are scoped to one calendar date. */
  bazarDate?: string;
  /** Duty assignments stay on the weekly rotation (0 = Saturday). */
  weekday?: number;
  name?: string;
  price?: number;
  completed?: boolean;
  consumerIds?: number[];
  baseUpdatedAt?: string;
  baseConsumerIds?: number[];
}

export interface BazarSyncResponse {
  item?: ApiBazarItem;
  assignments?: ApiBazarAssignment[];
  unreadCount?: number;
  notifiedCount?: number;
}

export interface DesiredAssignmentInput {
  weekday: number;
  consumerIds: number[];
  consumers: ApiConsumer[];
}
