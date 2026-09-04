import type { DatabaseMigration } from "./types";
export const messagesMigration: DatabaseMigration = {
  version: 10,
  name: "offline messages",
  sql: `
CREATE TABLE IF NOT EXISTS local_messages(local_id TEXT PRIMARY KEY NOT NULL,server_id INTEGER,user_id INTEGER NOT NULL,mess_id INTEGER NOT NULL,sender_user_id INTEGER NOT NULL,sender_name TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,status TEXT NOT NULL,server_cursor TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS local_messages_server_uq ON local_messages(mess_id,server_id) WHERE server_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS local_messages_order_idx ON local_messages(user_id,mess_id,created_at DESC);
CREATE TABLE IF NOT EXISTS local_message_read_state(user_id INTEGER NOT NULL,mess_id INTEGER NOT NULL,last_read_server_id INTEGER,unread_count INTEGER NOT NULL DEFAULT 0,read_pending INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,mess_id));`,
};
