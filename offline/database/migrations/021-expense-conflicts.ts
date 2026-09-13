import type { DatabaseMigration } from "./types";

/**
 * Keeps the server's item list next to a day whose change was rejected, so an
 * admin can compare both lists before choosing.
 */
export const expenseConflictsMigration: DatabaseMigration = {
  version: 21,
  name: "expense conflicts",
  sql: `
    ALTER TABLE local_expense_days ADD COLUMN conflict_server_items TEXT;
  `,
};
