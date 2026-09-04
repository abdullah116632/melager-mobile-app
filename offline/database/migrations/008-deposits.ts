import type { DatabaseMigration } from "./types";
export const depositsMigration: DatabaseMigration={version:8,name:"offline deposit entries",sql:`
CREATE TABLE IF NOT EXISTS local_deposit_entries (
 local_id TEXT PRIMARY KEY NOT NULL, server_id INTEGER, user_id INTEGER NOT NULL, mess_id INTEGER NOT NULL,
 consumer_id INTEGER NOT NULL, amount REAL NOT NULL, deposited_at TEXT NOT NULL, note TEXT,
 local_updated_at INTEGER NOT NULL, is_dirty INTEGER NOT NULL DEFAULT 0, is_deleted INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS local_deposit_server_uq ON local_deposit_entries(mess_id,server_id) WHERE server_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS local_deposit_month_idx ON local_deposit_entries(user_id,mess_id,deposited_at,is_deleted);
`};
