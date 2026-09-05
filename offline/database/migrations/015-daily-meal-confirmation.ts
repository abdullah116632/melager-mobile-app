import type { DatabaseMigration } from "./types";

export const dailyMealConfirmationMigration: DatabaseMigration = {
  version: 15,
  name: "daily meal server confirmation state",
  sql: `
ALTER TABLE local_daily_meals
  ADD COLUMN sync_state INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS local_daily_meals_sync_state_idx
  ON local_daily_meals(user_id, mess_id, year_month, sync_state);
`,
};
