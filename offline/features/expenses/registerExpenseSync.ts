import type { SQLiteDatabase } from "expo-sqlite";

import { api, ApiError, clearApiCache } from "@/lib/api";
import { SyncRejectionRepository } from "../../repositories/syncRejectionRepository";
import type { SyncRegistry } from "../../sync/registry";
import {
  ExpenseRepository,
  hashItems,
  type ExpensePayload,
} from "./ExpenseRepository";
import { getDhakaDate } from "@/utils/dashboard";

const formatDay = (yearMonth: string, day: number) =>
  new Date(
    `${yearMonth}-${String(day).padStart(2, "0")}T00:00:00`,
  ).toLocaleDateString("en-US", { day: "numeric", month: "short" });

/** A refusal that retrying cannot fix; the sync engine dead-letters these. */
const isRejection = (error: unknown): error is ApiError =>
  error instanceof ApiError &&
  error.status >= 400 &&
  error.status < 500 &&
  ![401, 408, 409, 425, 429].includes(error.status);

export const registerExpenseSync = (
  registry: SyncRegistry,
  database: SQLiteDatabase,
) => {
  const repository = new ExpenseRepository(database);
  const rejections = new SyncRejectionRepository(database);

  registry.registerProcessor("expense", async (operation, context) => {
    const payload = operation.payload as ExpensePayload;
    const { sentHashes = [], ...mutation } = payload;
    try {
      await api.syncExpenseDay(
        operation.id,
        context.messId!,
        mutation as unknown as Record<string, unknown>,
        context.token,
      );
      await repository.acknowledge(
        context.userId,
        context.messId!,
        payload,
        operation.id,
      );
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
        await repository.acknowledge(
          context.userId,
          context.messId!,
          payload,
          operation.id,
        );
        return;
      }
      if (!(error instanceof ApiError) || error.status !== 409) {
        if (isRejection(error)) {
          // The change is dropped; the next pull restores the server's list,
          // so tell the admin why their edit did not stay.
          await rejections.add(
            context.userId,
            context.messId!,
            "expenses",
            error.status === 403
              ? "Your expense changes were not saved: you no longer have admin access to this mess."
              : `The expense list for ${formatDay(payload.yearMonth, payload.day)} was not saved: ${error.message}.`,
          );
        }
        throw error;
      }

      clearApiCache();
      const month = await api.getMonthData(
        payload.yearMonth,
        context.token,
        context.messId!,
      );
      const serverItems = month.expenses[String(payload.day)]?.items ?? [];
      const serverHash = await hashItems(serverItems);
      if (serverHash === (await hashItems(payload.items))) {
        // An earlier attempt of this same list already landed.
        await repository.acknowledge(
          context.userId,
          context.messId!,
          payload,
          operation.id,
        );
        return;
      }
      const emptyHash = await hashItems([]);
      if (
        serverItems.length === 0 &&
        (payload.baseHash === "empty" || payload.baseHash === emptyHash)
      ) {
        // An empty day is stored either as no row or as an empty list, and
        // the month data cannot tell which; retry with the other form.
        await repository.rebase(
          operation.id,
          context.userId,
          context.messId!,
          payload,
          payload.baseHash === "empty" ? emptyHash : "empty",
        );
        throw new Error("Expense update is retrying on the confirmed list.");
      }
      if (serverHash === payload.baseHash) {
        // Nobody changed the day: an earlier attempt is still completing.
        throw new Error("Expense update is still being confirmed.");
      }
      if (sentHashes.includes(serverHash)) {
        // The server holds this device's own earlier list.
        await repository.rebase(
          operation.id,
          context.userId,
          context.messId!,
          payload,
          serverHash,
        );
        throw new Error("Expense update is retrying on the confirmed list.");
      }
      await repository.markConflict(
        context.userId,
        context.messId!,
        payload,
        error.message,
        serverItems,
      );
      // The engine can now remove this terminal operation; the conflict
      // modal on the Expenses page holds both lists until an admin chooses.
    }
  });

  registry.registerPuller("expenses", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    await repository.releaseOrphanedEdits(context.userId, context.messId);
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
