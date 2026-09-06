import type { DatabaseMigration } from "./types";

export const dashboardStatementMigration: DatabaseMigration = {
  version: 16,
  name: "offline dashboard statement cache",
  sql: `
    CREATE TABLE IF NOT EXISTS local_dashboard_statements (
      user_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      applied_range_json TEXT,
      range_data_json TEXT NOT NULL,
      consumers_json TEXT NOT NULL,
      saved_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mess_id),
      FOREIGN KEY (user_id) REFERENCES reference_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );
  `,
};
