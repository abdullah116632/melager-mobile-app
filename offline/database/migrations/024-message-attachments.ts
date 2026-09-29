import type { DatabaseMigration } from "./types";

/**
 * Files shared in the chat. The message keeps the server's description of the
 * file, and `local_message_media` remembers what this phone did with it: kept
 * it, or had it removed by the user, which must not be undone by an automatic
 * download the next time the message is synced.
 */
export const messageAttachmentsMigration: DatabaseMigration = {
  version: 24,
  name: "message attachments",
  sql: `
    ALTER TABLE local_messages ADD COLUMN attachment_json TEXT;

    CREATE TABLE IF NOT EXISTS local_message_media (
      file_id TEXT PRIMARY KEY NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('available', 'deleted')),
      updated_at INTEGER NOT NULL
    );
  `,
};
