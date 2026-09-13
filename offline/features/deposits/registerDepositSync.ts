import type { SQLiteDatabase } from "expo-sqlite";
import { ApiError, api, clearApiCache, type DepositEntry } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { DepositRepository } from "./DepositRepository";
import { getDhakaDate } from "@/utils/dashboard";
import { getDepositEntryDateParts } from "@/utils/deposit";

const normalizedNote = (note: string | null | undefined) =>
  (note ?? "").trim() || null;

const sameDeposit = (
  a: { amount?: number; depositedAt?: string; note?: string | null },
  b: DepositEntry,
) =>
  Number(a.amount) === Number(b.amount) &&
  Date.parse(String(a.depositedAt)) === Date.parse(b.depositedAt) &&
  normalizedNote(a.note) === normalizedNote(b.note);

/** There is no single-deposit endpoint, so look in the months it can be in. */
const findServerDeposit = async (
  messId: number,
  token: string,
  serverId: number,
  dates: Array<string | undefined>,
) => {
  clearApiCache();
  const months = new Set(
    dates.flatMap((depositedAt) => {
      const parts = depositedAt
        ? getDepositEntryDateParts({ depositedAt })
        : null;
      return parts ? [parts.yearMonth] : [];
    }),
  );
  for (const yearMonth of months) {
    const { entries } = await api.getDepositEntries(messId, yearMonth, token);
    const found = entries.find((entry) => entry.id === serverId);
    if (found) return found;
  }
  return null;
};

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
    if (p.operation !== "create" && !p.serverId && p.localId) {
      // Queued before its create was confirmed: wait for the create to hand
      // over a server id. If the create never landed there is nothing to
      // change server-side, and a delete only has to settle locally.
      if (await repository.isCreatePending(context.userId, p.localId)) {
        throw new Error("Deposit change is waiting for its create to sync.");
      }
      if (p.operation === "delete") await repository.acknowledgeDelete(p.localId);
      return;
    }
    let result: { entry?: DepositEntry; success?: boolean };
    try {
      result = await api.syncDepositMutation<{
        entry?: DepositEntry;
        success?: boolean;
      }>(operation.id, context.messId!, p.operation, p, context.token);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (
        p.operation !== "create" &&
        p.localId &&
        p.serverId &&
        error.hasErrorBody &&
        (error.status === 404 || error.status === 409)
      ) {
        if (error.status === 404) {
          // Deleted on another device. Deleting it here too is not a conflict.
          if (p.operation === "delete") {
            await repository.acknowledgeDelete(p.localId);
          } else {
            await repository.markConflict(p.localId, null);
          }
          return;
        }
        const current = await findServerDeposit(
          context.messId!,
          context.token,
          p.serverId,
          [p.base?.depositedAt, p.depositedAt],
        );
        if (!current) throw error;
        if (p.operation === "update" && sameDeposit(p, current)) {
          // An earlier attempt of this same edit already landed.
          await repository.acknowledgeMutation(p.localId, current, operation.id);
          return;
        }
        if (p.base && sameDeposit(p.base, current)) {
          // Nobody changed it: an earlier attempt is still completing.
          throw new Error("Deposit change is still being confirmed.");
        }
        await repository.markConflict(p.localId, {
          amount: Number(current.amount),
          depositedAt: current.depositedAt,
          note: current.note ?? null,
        });
        return;
      }
      // Older deployed servers expose the normal deposit CRUD endpoints but
      // not the offline sync endpoint. Keep an online local-first write from
      // being trapped in SQLite while that server is being upgraded. This is
      // limited to a missing *sync route*, which answers without a JSON body.
      if (
        error.status !== 404 ||
        error.hasErrorBody ||
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
