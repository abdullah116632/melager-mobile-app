import type { DatabaseMigration } from "./types";

export const dailyMealsMigration: DatabaseMigration = {
  version: 6,
  name: "offline daily meal counts",
  sql: `
    CREATE TABLE IF NOT EXISTS local_daily_meals (
      user_id INTEGER NOT NULL, mess_id INTEGER NOT NULL, year_month TEXT NOT NULL,
      consumer_id TEXT NOT NULL, day INTEGER NOT NULL, count REAL NOT NULL,
      base_count REAL NOT NULL DEFAULT 0, is_dirty INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mess_id, year_month, consumer_id, day)
    );
    CREATE INDEX IF NOT EXISTS local_daily_meals_month_idx
      ON local_daily_meals(user_id, mess_id, year_month, is_dirty);
  `,
};
