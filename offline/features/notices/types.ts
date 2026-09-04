import type { ApiNotice } from "@/lib/api";

export interface NoticesSnapshot {
  notices: ApiNotice[];
  unreadCount: number;
  pendingCount: number;
  savedAt: number;
}

export type NoticeSyncOperation =
  | "notice_create"
  | "notice_update"
  | "notice_delete"
  | "notice_reorder"
  | "notifications_read";

export interface NoticeMutationPayload {
  localId?: string;
  serverId?: number;
  title?: string;
  body?: string;
  color?: string;
  noticeIds?: number[];
  localIds?: string[];
}
