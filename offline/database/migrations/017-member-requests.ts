import type { DatabaseMigration } from "./types";

export const memberRequestsMigration: DatabaseMigration = {
  version: 17,
  name: "offline member requests cache",
  sql: `
    CREATE TABLE IF NOT EXISTS local_member_requests (
      user_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      requests_json TEXT NOT NULL,
      saved_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mess_id),
      FOREIGN KEY (user_id) REFERENCES reference_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );
  `,
};
