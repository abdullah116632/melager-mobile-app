import type { SQLiteDatabase } from "expo-sqlite";

import type { DashboardDateRange, MonthData } from "@/types/dashboard";
import type { Consumer } from "@/types/mess";

export interface DashboardStatementSnapshot {
  appliedRange: DashboardDateRange | null;
  rangeData: Record<string, MonthData>;
  consumers: Consumer[];
  savedAt: number;
}

interface StatementRow {
  applied_range_json: string | null;
  range_data_json: string;
  consumers_json: string;
  saved_at: number;
}

export class DashboardStatementRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async getSnapshot(
    userId: number,
    messId: number,
  ): Promise<DashboardStatementSnapshot | null> {
    const row = await this.database.getFirstAsync<StatementRow>(
      `SELECT applied_range_json, range_data_json, consumers_json, saved_at
       FROM local_dashboard_statements
       WHERE user_id = ? AND mess_id = ?`,
      userId,
      messId,
    );
    if (!row) return null;
    return {
      appliedRange: row.applied_range_json
        ? (JSON.parse(row.applied_range_json) as DashboardDateRange)
        : null,
      rangeData: JSON.parse(row.range_data_json) as Record<string, MonthData>,
      consumers: JSON.parse(row.consumers_json) as Consumer[],
      savedAt: row.saved_at,
    };
  }

  async replaceSnapshot(
    userId: number,
    messId: number,
    data: {
      appliedRange: DashboardDateRange | null;
      rangeData: Record<string, MonthData>;
      consumers: Consumer[];
    },
  ): Promise<number> {
    const savedAt = Date.now();
    await this.database.runAsync(
      `INSERT INTO local_dashboard_statements (
        user_id, mess_id, applied_range_json, range_data_json, consumers_json, saved_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, mess_id) DO UPDATE SET
        applied_range_json = excluded.applied_range_json,
        range_data_json = excluded.range_data_json,
        consumers_json = excluded.consumers_json,
        saved_at = excluded.saved_at`,
      userId,
      messId,
      data.appliedRange ? JSON.stringify(data.appliedRange) : null,
      JSON.stringify(data.rangeData),
      JSON.stringify(data.consumers),
      savedAt,
    );
    return savedAt;
  }
}
