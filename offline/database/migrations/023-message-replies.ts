import type { DatabaseMigration } from "./types";

/**
 * Swipe-to-reply. The quote is stored alongside the reply rather than looked
 * up, so a reply still shows what it answers when the quoted message sits
 * further back than the pages this device has cached.
 */
export const messageRepliesMigration: DatabaseMigration = {
  version: 23,
  name: "message replies",
  sql: `
    ALTER TABLE local_messages ADD COLUMN reply_to_server_id INTEGER;
    ALTER TABLE local_messages ADD COLUMN reply_to_sender_user_id INTEGER;
    ALTER TABLE local_messages ADD COLUMN reply_to_sender_name TEXT;
    ALTER TABLE local_messages ADD COLUMN reply_to_body TEXT;
  `,
};
