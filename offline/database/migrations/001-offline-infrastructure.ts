import type { DatabaseMigration } from "./types";

export const offlineInfrastructureMigration: DatabaseMigration = {
  version: 1,
  name: "offline infrastructure",
  sql: `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_metadata (
      metadata_key TEXT PRIMARY KEY NOT NULL,
      metadata_value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offline_outbox (
      id TEXT PRIMARY KEY NOT NULL,
      dedupe_key TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      mess_id INTEGER,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (
        operation IN ('create', 'update', 'delete', 'upsert', 'command')
      ),
      payload TEXT NOT NULL,
      base_version INTEGER,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'syncing', 'failed')
      ),
      attempt_count INTEGER NOT NULL DEFAULT 0,
      next_attempt_at INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS offline_outbox_ready_idx
      ON offline_outbox(status, next_attempt_at, created_at);

    CREATE UNIQUE INDEX IF NOT EXISTS offline_outbox_user_dedupe_uq
      ON offline_outbox(user_id, dedupe_key);

    CREATE INDEX IF NOT EXISTS offline_outbox_scope_idx
      ON offline_outbox(user_id, mess_id, created_at);

    CREATE INDEX IF NOT EXISTS offline_outbox_entity_idx
      ON offline_outbox(entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS sync_state (
      scope_key TEXT PRIMARY KEY NOT NULL,
      user_id INTEGER NOT NULL,
      mess_id INTEGER,
      collection TEXT NOT NULL,
      cursor TEXT,
      last_synced_at INTEGER,
      last_error TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sync_state_scope_idx
      ON sync_state(user_id, mess_id, collection);
  `,
};
