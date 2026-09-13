import type { DatabaseMigration } from "./types";

/**
 * Keeps a deposit change the server rejected, together with the server's
 * version, until an admin chooses which one stays.
 */
export const depositConflictsMigration: DatabaseMigration = {
  version: 20,
  name: "deposit conflicts",
  sql: `
    ALTER TABLE local_deposit_entries ADD COLUMN conflict_kind TEXT;
    ALTER TABLE local_deposit_entries ADD COLUMN conflict_server TEXT;
  `,
};
