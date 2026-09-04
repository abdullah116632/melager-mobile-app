import type { DatabaseMigration } from "./types";

export const noticesMigration: DatabaseMigration = {
  version: 4,
  name: "offline notice board",
  sql: `
    CREATE TABLE IF NOT EXISTS local_notices (
      local_id TEXT PRIMARY KEY NOT NULL,
      server_id INTEGER,
      display_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      serial_no INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      color TEXT NOT NULL,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      server_updated_at TEXT,
      local_updated_at INTEGER NOT NULL,
      is_dirty INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS local_notices_server_uq
      ON local_notices(mess_id, server_id) WHERE server_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS local_notices_display_uq
      ON local_notices(mess_id, display_id);
    CREATE INDEX IF NOT EXISTS local_notices_order_idx
      ON local_notices(mess_id, is_deleted, serial_no, created_at);

    CREATE TABLE IF NOT EXISTS local_notice_read_state (
      user_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      unread_count INTEGER NOT NULL DEFAULT 0,
      read_pending INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mess_id),
      FOREIGN KEY (user_id) REFERENCES reference_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );
  `,
};
