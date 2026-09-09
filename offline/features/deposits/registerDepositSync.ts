import type { SQLiteDatabase } from "expo-sqlite";
import { ApiError, api, type DepositEntry } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { DepositRepository } from "./DepositRepository";
import { getDhakaDate } from "@/utils/dashboard";

export const registerDepositSync = (
  registry: SyncRegistry,
  database: SQLiteDatabase,
) => {
  const repository = new DepositRepository(database);
  registry.registerProcessor("deposit", async (operation, context) => {
    const p = operation.payload as {
      operation: "create" | "update" | "delete";
      serverId?: number;
      localId?: string;
      consumerId?: number;
      amount?: number;
      depositedAt?: string;
      note?: string;
      base?: { amount: number; depositedAt: string; note: string | null };
    };
    let result: { entry?: DepositEntry; success?: boolean };
    try {
      result = await api.syncDepositMutation<{
        entry?: DepositEntry;
        success?: boolean;
      }>(operation.id, context.messId!, p.operation, p, context.token);
    } catch (error) {
      // Older deployed servers expose the normal deposit CRUD endpoints but
      // not the offline sync endpoint. Keep an online local-first write from
      // being trapped in SQLite while that server is being upgraded. This is
      // intentionally limited to a missing *sync route*; real 404s from a
      // current sync endpoint still remain visible to the conflict UI/outbox.
      if (
        !(error instanceof ApiError) ||
        error.status !== 404 ||
        error.path !== "/mess/deposits/sync"
      ) {
        throw error;
      }
      if (p.operation === "create") {
        if (!p.consumerId || p.amount === undefined || !p.depositedAt) {
          throw new Error("The queued deposit is incomplete.");
        }
        result = await api.addDepositEntry(
          {
            messId: context.messId!,
            consumerId: p.consumerId,
            amount: p.amount,
            depositedAt: p.depositedAt,
            note: p.note,
          },
          context.token,
        );
      } else if (p.operation === "update") {
        if (!p.serverId || p.amount === undefined || !p.depositedAt) {
          throw new Error("The queued deposit update is incomplete.");
        }
        result = await api.updateDepositEntry(
          p.serverId,
          {
            messId: context.messId!,
            amount: p.amount,
            depositedAt: p.depositedAt,
            note: p.note,
          },
          context.token,
        );
      } else {
        if (!p.serverId)
          throw new Error("The queued deposit delete is incomplete.");
        result = await api.deleteDepositEntry(
          p.serverId,
          context.messId!,
          context.token,
        );
      }
    }
    if (
      (p.operation === "create" || p.operation === "update") &&
      p.localId &&
      result.entry
    )
      await repository.acknowledgeMutation(
        p.localId,
        result.entry,
        operation.id,
      );
    if (p.operation === "delete" && p.localId)
      await repository.acknowledgeDelete(p.localId);
  });
  registry.registerPuller("deposits", async (_cursor, context) => {
    if (context.messId === null) return { cursor: null };
    const yearMonth = getDhakaDate().slice(0, 7);
    const result = await api.getDepositEntries(
      context.messId,
      yearMonth,
      context.token,
    );
    await repository.replace(
      context.userId,
      context.messId,
      yearMonth,
      result.entries,
    );
    return { cursor: null };
  });
};
