import type { DatabaseMigration } from "./types";

export const bazarMigration: DatabaseMigration = {
  version: 3,
  name: "offline bazar",
  sql: `
    CREATE TABLE IF NOT EXISTS local_bazar_items (
      local_id TEXT PRIMARY KEY NOT NULL,
      server_id INTEGER,
      display_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_by_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      server_updated_at TEXT,
      local_updated_at INTEGER NOT NULL,
      is_dirty INTEGER NOT NULL DEFAULT 0,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS local_bazar_items_server_uq
      ON local_bazar_items(mess_id, server_id) WHERE server_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS local_bazar_items_display_uq
      ON local_bazar_items(mess_id, display_id);
    CREATE INDEX IF NOT EXISTS local_bazar_items_day_idx
      ON local_bazar_items(mess_id, weekday, is_deleted, created_at);

    CREATE TABLE IF NOT EXISTS local_bazar_assignments (
      local_id TEXT PRIMARY KEY NOT NULL,
      server_id INTEGER,
      display_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      consumer_id INTEGER NOT NULL,
      name TEXT,
      email TEXT,
      local_updated_at INTEGER NOT NULL,
      is_dirty INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS local_bazar_assignments_server_uq
      ON local_bazar_assignments(mess_id, server_id) WHERE server_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS local_bazar_assignments_member_uq
      ON local_bazar_assignments(mess_id, weekday, consumer_id);
    CREATE INDEX IF NOT EXISTS local_bazar_assignments_day_idx
      ON local_bazar_assignments(mess_id, weekday);

    CREATE TABLE IF NOT EXISTS local_bazar_notification_state (
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
