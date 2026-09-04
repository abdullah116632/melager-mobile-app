import type { DatabaseMigration } from "./types";
export const notificationsMigration: DatabaseMigration = {
  version: 11,
  name: "offline notifications",
  sql: `CREATE TABLE IF NOT EXISTS local_notifications(user_id INTEGER NOT NULL,mess_id INTEGER NOT NULL,server_id INTEGER NOT NULL,type TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL,read_at INTEGER,read_pending INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,mess_id,server_id));CREATE INDEX IF NOT EXISTS local_notifications_order_idx ON local_notifications(user_id,mess_id,created_at DESC);`,
};
