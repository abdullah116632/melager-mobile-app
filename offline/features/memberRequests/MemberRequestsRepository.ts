import type { SQLiteDatabase } from "expo-sqlite";

import type { MemberRequest } from "@/types/memberRequest";

export interface MemberRequestsSnapshot {
  requests: MemberRequest[];
  savedAt: number;
}

interface MemberRequestsRow {
  requests_json: string;
  saved_at: number;
}

export class MemberRequestsRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async getSnapshot(
    userId: number,
    messId: number,
  ): Promise<MemberRequestsSnapshot | null> {
    const row = await this.database.getFirstAsync<MemberRequestsRow>(
      `SELECT requests_json, saved_at
       FROM local_member_requests
       WHERE user_id = ? AND mess_id = ?`,
      userId,
      messId,
    );
    if (!row) return null;
    return {
      requests: JSON.parse(row.requests_json) as MemberRequest[],
      savedAt: row.saved_at,
    };
  }

  async replaceSnapshot(
    userId: number,
    messId: number,
    requests: MemberRequest[],
  ): Promise<number> {
    const savedAt = Date.now();
    await this.database.runAsync(
      `INSERT INTO local_member_requests (
        user_id, mess_id, requests_json, saved_at
      ) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, mess_id) DO UPDATE SET
        requests_json = excluded.requests_json,
        saved_at = excluded.saved_at`,
      userId,
      messId,
      JSON.stringify(requests),
      savedAt,
    );
    return savedAt;
  }
}
