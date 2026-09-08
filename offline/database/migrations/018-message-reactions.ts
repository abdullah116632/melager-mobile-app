import type { DatabaseMigration } from "./types";

export const messageReactionsMigration: DatabaseMigration = {
  version: 18,
  name: "message reactions",
  sql: `
    CREATE TABLE IF NOT EXISTS local_message_reactions (
      mess_id INTEGER NOT NULL,
      message_server_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reaction TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      is_dirty INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (message_server_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS local_message_reactions_message_idx
      ON local_message_reactions(mess_id, message_server_id);
  `,
};
