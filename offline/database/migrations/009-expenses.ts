import type { DatabaseMigration } from "./types";
export const expensesMigration: DatabaseMigration = {
  version: 9,
  name: "offline expense days",
  sql: `CREATE TABLE IF NOT EXISTS local_expense_days(user_id INTEGER NOT NULL,mess_id INTEGER NOT NULL,year_month TEXT NOT NULL,day INTEGER NOT NULL,items_json TEXT NOT NULL,base_hash TEXT NOT NULL,is_dirty INTEGER NOT NULL DEFAULT 0,conflict_message TEXT,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,mess_id,year_month,day));`,
};
