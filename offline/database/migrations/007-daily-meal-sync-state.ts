import type { DatabaseMigration } from "./types";

export const dailyMealSyncStateMigration: DatabaseMigration = {
  version: 7,
  name: "daily meal month cursors and conflicts",
  sql: `
    ALTER TABLE local_daily_meals ADD COLUMN conflict_message TEXT;
    CREATE TABLE IF NOT EXISTS local_daily_meal_months (
      user_id INTEGER NOT NULL, mess_id INTEGER NOT NULL, year_month TEXT NOT NULL,
      cursor TEXT, updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mess_id, year_month)
    );
  `,
};
