import type { DatabaseMigration } from "./types";

export const mealCalendarMigration: DatabaseMigration = {
  version: 14,
  name: "offline meal calendar cache",
  sql: `
    CREATE TABLE IF NOT EXISTS local_meal_calendars (
      user_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      year_month TEXT NOT NULL,
      markers_json TEXT NOT NULL,
      saved_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mess_id, year_month),
      FOREIGN KEY (user_id) REFERENCES reference_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );
  `,
};
