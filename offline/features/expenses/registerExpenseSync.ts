import type { SQLiteDatabase } from "expo-sqlite";
import { api } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { ExpenseRepository } from "./ExpenseRepository";
import type { DayExpenseItem } from "@/types/mess";
export const registerExpenseSync = (
  registry: SyncRegistry,
  database: SQLiteDatabase,
) => {
  const repository = new ExpenseRepository(database);
  registry.registerProcessor("expense", async (op, ctx) => {
    const p = op.payload as {
      yearMonth: string;
      day: number;
      items: DayExpenseItem[];
    };
    await api.syncExpenseDay(
      op.id,
      ctx.messId!,
      p as Record<string, unknown>,
      ctx.token,
    );
    await repository.acknowledge(ctx.userId, ctx.messId!, p);
  });
};
