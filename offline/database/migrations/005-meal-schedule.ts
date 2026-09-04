import type { DatabaseMigration } from "./types";

export const mealScheduleMigration: DatabaseMigration = {
  version: 5,
  name: "offline meal schedules and menus",
  sql: `
    CREATE TABLE IF NOT EXISTS local_meal_schedules (
      user_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      local_updated_at INTEGER NOT NULL,
      is_dirty INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, mess_id, date),
      FOREIGN KEY (user_id) REFERENCES reference_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS local_meal_schedules_lookup_idx
      ON local_meal_schedules(mess_id, date);
  `,
};
