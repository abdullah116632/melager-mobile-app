import type { SQLiteDatabase } from "expo-sqlite";

import { api, ApiError, clearApiCache } from "@/lib/api";
import type { DayExpenseItem } from "@/types/mess";
import type { SyncRegistry } from "../../sync/registry";
import { ExpenseRepository } from "./ExpenseRepository";
import { getDhakaDate } from "@/utils/dashboard";

interface ExpensePayload {
  yearMonth: string;
  day: number;
  items: DayExpenseItem[];
  baseHash: string;
}

export const registerExpenseSync = (
  registry: SyncRegistry,
  database: SQLiteDatabase,
) => {
  const repository = new ExpenseRepository(database);

  registry.registerProcessor("expense", async (operation, context) => {
    const payload = operation.payload as ExpensePayload;
    try {
      await api.syncExpenseDay(
        operation.id,
        context.messId!,
        payload as unknown as Record<string, unknown>,
        context.token,
      );
      await repository.acknowledge(context.userId, context.messId!, payload);
    } catch (error) {
      // The deployed legacy server may have the normal expense endpoint
      // before it receives the offline-sync route. Do not strand a local
      // change in SQLite in that rollout window.
      if (
        error instanceof ApiError &&
        error.status === 404 &&
        error.path === "/mess/expenses/sync"
      ) {
        await api.setExpense(
          payload.yearMonth,
          payload.day,
          payload.items,
          context.token,
          context.messId!,
        );
        await repository.acknowledge(context.userId, context.messId!, payload);
        return;
      }
      if (!(error instanceof ApiError) || error.status !== 409) throw error;

      clearApiCache();
      const month = await api.getMonthData(
        payload.yearMonth,
        context.token,
        context.messId!,
      );
      const serverItems = month.expenses[String(payload.day)]?.items ?? [];
      await repository.markConflict(
        context.userId,
        context.messId!,
        payload,
        error.message,
        serverItems,
      );
      // The engine can now remove this terminal operation and continue. The
      // dirty row remains available for an explicit user retry.
    }
  });

  registry.registerPuller("expenses", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    const months = new Set(
      await repository.getTrackedMonths(context.userId, context.messId),
    );
    months.add(getDhakaDate().slice(0, 7));
    clearApiCache();
    for (const yearMonth of months) {
      const data = await api.getMonthData(
        yearMonth,
        context.token,
        context.messId,
      );
      await repository.mergeRemote(
        context.userId,
        context.messId,
        yearMonth,
        data.expenses,
      );
    }
    return { cursor: null };
  });
};
