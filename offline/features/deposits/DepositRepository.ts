import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import type { DepositEntry } from "@/lib/api";
import { OutboxRepository } from "../../repositories/outboxRepository";
import { runInTransaction } from "../../database/transaction";

type Row = {
  local_id: string;
  server_id: number | null;
  user_id: number;
  mess_id: number;
  consumer_id: number;
  amount: number;
  deposited_at: string;
  note: string | null;
  is_deleted: number;
};
type DepositBaseSnapshot = {
  amount: number;
  depositedAt: string;
  note: string | null;
};
const toEntry = (r: Row): DepositEntry => ({
  id:
    r.server_id ??
    -Number.parseInt(r.local_id.replace(/\D/g, "").slice(-12) || "1", 10),
  consumerId: r.consumer_id,
  amount: Number(r.amount),
  depositedAt: r.deposited_at,
  note: r.note,
});
export class DepositRepository {
  private outbox: OutboxRepository;
  constructor(private db: SQLiteDatabase) {
    this.outbox = new OutboxRepository(db);
  }
  async list(userId: number, messId: number, yearMonth: string) {
    const rows = await this.db.getAllAsync<Row>(
      "SELECT * FROM local_deposit_entries WHERE user_id=? AND mess_id=? AND is_deleted=0 AND substr(deposited_at,1,7)=? ORDER BY deposited_at DESC, local_updated_at DESC",
      userId,
      messId,
      yearMonth,
    );
    return rows.map(toEntry);
  }
  async replace(
    userId: number,
    messId: number,
    yearMonth: string,
    entries: DepositEntry[],
  ) {
    await runInTransaction(this.db, async () => {
      for (const entry of entries) {
        await this.db.runAsync(
          `INSERT INTO local_deposit_entries(local_id,server_id,user_id,mess_id,consumer_id,amount,deposited_at,note,local_updated_at,is_dirty,is_deleted) VALUES(?,?,?,?,?,?,?,?,?,0,0) ON CONFLICT(mess_id,server_id) WHERE server_id IS NOT NULL DO UPDATE SET consumer_id=excluded.consumer_id,amount=excluded.amount,deposited_at=excluded.deposited_at,note=excluded.note,is_deleted=0 WHERE local_deposit_entries.is_dirty=0`,
          String(entry.id),
          entry.id,
          userId,
          messId,
          entry.consumerId,
          entry.amount,
          entry.depositedAt,
          entry.note ?? null,
          Date.now(),
        );
      }

      // The remote month is authoritative. Preserve dirty rows because they
      // represent an unsynced local write, but remove clean server rows that
      // no longer exist remotely (for example, deleted on another device).
      const serverIds = entries.map((entry) => entry.id);
      const baseSql = `DELETE FROM local_deposit_entries
        WHERE user_id = ? AND mess_id = ?
          AND substr(deposited_at, 1, 7) = ?
          AND server_id IS NOT NULL
          AND is_dirty = 0 AND is_deleted = 0`;
      if (serverIds.length === 0) {
        await this.db.runAsync(baseSql, userId, messId, yearMonth);
      } else {
        const placeholders = serverIds.map(() => "?").join(", ");
        await this.db.runAsync(
          `${baseSql} AND server_id NOT IN (${placeholders})`,
          userId,
          messId,
          yearMonth,
          ...serverIds,
        );
      }
    });
  }
  async create(
    userId: number,
    data: {
      messId: number;
      consumerId: number;
      amount: number;
      depositedAt: string;
      note?: string;
    },
  ) {
    const localId = Crypto.randomUUID(),
      now = Date.now();
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        "INSERT INTO local_deposit_entries VALUES(?,NULL,?,?,?,?,?,?,?,1,0)",
        localId,
        userId,
        data.messId,
        data.consumerId,
        data.amount,
        data.depositedAt,
        data.note ?? null,
        now,
      );
      await this.outbox.enqueue({
        userId,
        messId: data.messId,
        entityType: "deposit",
        entityId: localId,
        operation: "create",
        dedupeKey: `deposit:${localId}`,
        payload: { operation: "create", localId, ...data },
      });
    });
    const r = await this.db.getFirstAsync<Row>(
      "SELECT * FROM local_deposit_entries WHERE local_id=?",
      localId,
    );
    return toEntry(r!);
  }
  async acknowledgeMutation(
    localId: string,
    entry: DepositEntry,
    operationId: string,
  ) {
    const pending = await this.db.getAllAsync<{ id: string; payload: string }>(
      `SELECT id, payload FROM offline_outbox
       WHERE entity_type='deposit' AND entity_id=? AND id<>?`,
      localId,
      operationId,
    );
    if (pending.length > 0) {
      await runInTransaction(this.db, async () => {
        await this.db.runAsync(
          "UPDATE local_deposit_entries SET server_id=? WHERE local_id=?",
          entry.id,
          localId,
        );
        const base: DepositBaseSnapshot = {
          amount: entry.amount,
          depositedAt: entry.depositedAt,
          note: entry.note ?? null,
        };
        for (const row of pending) {
          const payload = JSON.parse(row.payload) as Record<string, unknown>;
          await this.db.runAsync(
            "UPDATE offline_outbox SET payload=?,updated_at=? WHERE id=?",
            JSON.stringify({
              ...payload,
              operation: payload.operation === "delete" ? "delete" : "update",
              serverId: entry.id,
              base,
            }),
            Date.now(),
            row.id,
          );
        }
      });
      return;
    }
    await this.db.runAsync(
      "UPDATE local_deposit_entries SET server_id=?,amount=?,deposited_at=?,note=?,is_dirty=0 WHERE local_id=?",
      entry.id,
      entry.amount,
      entry.depositedAt,
      entry.note ?? null,
      localId,
    );
  }
  async acknowledgeDelete(localId: string) {
    await this.db.runAsync(
      "DELETE FROM local_deposit_entries WHERE local_id=?",
      localId,
    );
  }
  async updateById(
    userId: number,
    messId: number,
    id: number,
    data: { amount: number; depositedAt: string; note?: string },
  ) {
    const rows = await this.db.getAllAsync<Row>(
      "SELECT * FROM local_deposit_entries WHERE user_id=? AND mess_id=? AND is_deleted=0",
      userId,
      messId,
    );
    const row = rows.find((item) => toEntry(item).id === id);
    if (!row) throw new Error("Deposit entry is not available offline.");
    const base = await this.getMutationBase(userId, row);
    // The edited row and the outbox entry that will push it have to commit
    // together. Apart, an interruption between them leaves an amount that is
    // changed on this device, marked dirty so no pull may correct it, and
    // queued nowhere — a ledger entry that silently never reaches the server.
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        "UPDATE local_deposit_entries SET amount=?,deposited_at=?,note=?,is_dirty=1,local_updated_at=? WHERE local_id=?",
        data.amount,
        data.depositedAt,
        data.note ?? null,
        Date.now(),
        row.local_id,
      );
      await this.outbox.enqueue({
        userId,
        messId,
        entityType: "deposit",
        entityId: row.local_id,
        operation: "update",
        dedupeKey: `deposit:${row.local_id}`,
        payload: {
          operation: row.server_id ? "update" : "create",
          localId: row.local_id,
          serverId: row.server_id,
          consumerId: row.consumer_id,
          base,
          ...data,
        },
      });
    });
    return { ...toEntry(row), ...data };
  }
  async deleteById(userId: number, messId: number, id: number) {
    const rows = await this.db.getAllAsync<Row>(
      "SELECT * FROM local_deposit_entries WHERE user_id=? AND mess_id=? AND is_deleted=0",
      userId,
      messId,
    );
    const row = rows.find((item) => toEntry(item).id === id);
    if (!row) throw new Error("Deposit entry is not available offline.");
    if (row.server_id === null) {
      // Deleting the row without also dropping its queued create would push a
      // deposit the user has just deleted, so it would reappear for everyone.
      await runInTransaction(this.db, async () => {
        await this.db.runAsync(
          "DELETE FROM local_deposit_entries WHERE local_id=?",
          row.local_id,
        );
        await this.db.runAsync(
          "DELETE FROM offline_outbox WHERE user_id=? AND dedupe_key=?",
          userId,
          `deposit:${row.local_id}`,
        );
      });
      return;
    }
    const base = await this.getMutationBase(userId, row);
    // Same pairing as above: hiding the entry locally without queueing the
    // delete would drop it from this device while it lives on for everyone
    // else, and the dirty flag keeps any pull from putting it back.
    await runInTransaction(this.db, async () => {
      await this.db.runAsync(
        "UPDATE local_deposit_entries SET is_deleted=1,is_dirty=1 WHERE local_id=?",
        row.local_id,
      );
      await this.outbox.enqueue({
        userId,
        messId,
        entityType: "deposit",
        entityId: row.local_id,
        operation: "delete",
        dedupeKey: `deposit:${row.local_id}`,
        payload: {
          operation: "delete",
          localId: row.local_id,
          serverId: row.server_id,
          base,
        },
      });
    });
  }
  private async getMutationBase(
    userId: number,
    row: Row,
  ): Promise<DepositBaseSnapshot> {
    const pending = await this.db.getFirstAsync<{ payload: string }>(
      "SELECT payload FROM offline_outbox WHERE user_id=? AND dedupe_key=?",
      userId,
      `deposit:${row.local_id}`,
    );
    if (pending) {
      const base = (
        JSON.parse(pending.payload) as { base?: DepositBaseSnapshot }
      ).base;
      if (base) return base;
    }
    return {
      amount: Number(row.amount),
      depositedAt: row.deposited_at,
      note: row.note,
    };
  }
}
