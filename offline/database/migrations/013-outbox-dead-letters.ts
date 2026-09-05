import type { DatabaseMigration } from "./types";

export const outboxDeadLettersMigration: DatabaseMigration = {
  version: 13,
  name: "outbox dead letters",
  sql: `
    CREATE TABLE IF NOT EXISTS offline_outbox_dead_letters (
      id TEXT PRIMARY KEY NOT NULL,
      dedupe_key TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      mess_id INTEGER,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      base_version INTEGER,
      attempt_count INTEGER NOT NULL,
      last_error TEXT NOT NULL,
      http_status INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      failed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS offline_outbox_dead_letters_scope_idx
      ON offline_outbox_dead_letters(user_id, mess_id, failed_at DESC);
  `,
};
