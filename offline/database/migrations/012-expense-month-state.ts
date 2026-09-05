import type { DatabaseMigration } from "./types";

export const expenseMonthStateMigration: DatabaseMigration = {
  version: 12,
  name: "offline expense month state",
  sql: `
CREATE TABLE IF NOT EXISTS local_expense_months (
  user_id INTEGER NOT NULL,
  mess_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, mess_id, year_month)
);
INSERT OR IGNORE INTO local_expense_months(user_id, mess_id, year_month, updated_at)
SELECT user_id, mess_id, year_month, MAX(updated_at)
FROM local_expense_days
GROUP BY user_id, mess_id, year_month;
`,
};
