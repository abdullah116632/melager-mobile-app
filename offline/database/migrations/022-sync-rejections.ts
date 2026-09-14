import type { DatabaseMigration } from "./types";

/**
 * Changes the server turned down because another admin changed the same thing
 * first. The server's version wins; these rows only tell the admin why.
 */
export const syncRejectionsMigration: DatabaseMigration = {
  version: 22,
  name: "sync rejection notices",
  sql: `
    CREATE TABLE IF NOT EXISTS local_sync_rejections (
      id TEXT PRIMARY KEY NOT NULL,
      user_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      scope TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS local_sync_rejections_scope_idx
      ON local_sync_rejections(user_id, mess_id, scope, created_at);
  `,
};
