import type { ApiBazarAssignment, ApiBazarItem, ApiConsumer } from "@/lib/api";

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
  | "notifications_read"
  | "notify_members";

export interface BazarMutationPayload {
  localId?: string;
  serverId?: number;
  weekday?: number;
  name?: string;
  price?: number;
  completed?: boolean;
  consumerIds?: number[];
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
