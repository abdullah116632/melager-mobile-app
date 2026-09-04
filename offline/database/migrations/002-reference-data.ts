import type { DatabaseMigration } from "./types";

export const referenceDataMigration: DatabaseMigration = {
  version: 2,
  name: "shared session and reference data",
  sql: `
    CREATE TABLE IF NOT EXISTS reference_users (
      user_id INTEGER PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      mobile_number TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reference_messes (
      mess_id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      mess_key TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reference_memberships (
      user_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, mess_id),
      FOREIGN KEY (user_id) REFERENCES reference_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS reference_memberships_mess_idx
      ON reference_memberships(mess_id, user_id);

    CREATE TABLE IF NOT EXISTS reference_member_requests (
      request_id INTEGER PRIMARY KEY NOT NULL,
      user_id INTEGER NOT NULL,
      mess_id INTEGER NOT NULL,
      mess_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'rejected')),
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES reference_users(user_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS reference_member_requests_user_idx
      ON reference_member_requests(user_id, status);

    CREATE TABLE IF NOT EXISTS reference_consumers (
      consumer_id INTEGER PRIMARY KEY NOT NULL,
      mess_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      user_id INTEGER,
      email TEXT,
      mobile_number TEXT,
      is_admin INTEGER,
      account_deleted_at TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (mess_id) REFERENCES reference_messes(mess_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS reference_consumers_mess_idx
      ON reference_consumers(mess_id, consumer_id);

    CREATE INDEX IF NOT EXISTS reference_consumers_user_idx
      ON reference_consumers(user_id, mess_id);

    CREATE TABLE IF NOT EXISTS local_session (
      singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1),
      user_id INTEGER NOT NULL,
      active_mess_id INTEGER,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES reference_users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (active_mess_id) REFERENCES reference_messes(mess_id) ON DELETE SET NULL
    );
  `,
};
