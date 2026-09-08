import type { DatabaseMigration } from "./types";

/**
 * Bazar items move from a weekly template to per-date lists. Assignments stay
 * on the weekly rotation, so `local_bazar_assignments` is left alone.
 *
 * Existing rows only knew a weekday (0 = Saturday ... 6 = Friday), so they are
 * parked on the next occurrence of that weekday; the server sends the real date
 * on the following pull.
 */
export const bazarDateMigration: DatabaseMigration = {
  version: 19,
  name: "bazar items by date",
  sql: `
    CREATE TABLE IF NOT EXISTS local_bazar_items_dated (
      local_id TEXT PRIMARY KEY NOT NULL,
      server_id INTEGER,
      display_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      bazar_date TEXT NOT NULL,
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

    INSERT INTO local_bazar_items_dated (
      local_id, server_id, display_id, mess_id, bazar_date, name, price,
      is_completed, created_by_user_id, created_at, server_updated_at,
      local_updated_at, is_dirty, is_deleted
    )
    SELECT
      local_id, server_id, display_id, mess_id,
      date(
        'now',
        '+' || ((weekday - ((CAST(strftime('%w', 'now') AS INTEGER) + 1) % 7) + 7) % 7) || ' days'
      ),
      name, price, is_completed, created_by_user_id, created_at,
      server_updated_at, local_updated_at, is_dirty, is_deleted
    FROM local_bazar_items;

    DROP TABLE local_bazar_items;
    ALTER TABLE local_bazar_items_dated RENAME TO local_bazar_items;

    CREATE UNIQUE INDEX IF NOT EXISTS local_bazar_items_server_uq
      ON local_bazar_items(mess_id, server_id) WHERE server_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS local_bazar_items_display_uq
      ON local_bazar_items(mess_id, display_id);
    CREATE INDEX IF NOT EXISTS local_bazar_items_day_idx
      ON local_bazar_items(mess_id, bazar_date, is_deleted, created_at);
  `,
};
