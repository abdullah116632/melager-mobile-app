import type { SQLiteDatabase } from "expo-sqlite";

import type {
  ApiConsumer,
  ApiMessWithRole,
  ApiMyRequest,
  ApiUser,
  LocalAuthSnapshot,
  LocalConsumerSnapshot,
  ReferenceDataStore,
} from "./types";

interface SessionRow {
  user_id: number;
  active_mess_id: number | null;
  saved_at: number;
  email: string;
  name: string;
  mobile_number: string | null;
}

interface MessRow {
  mess_id: number;
  name: string;
  mess_key: string;
  role: "admin" | "member";
}

interface RequestRow {
  request_id: number;
  mess_id: number;
  mess_name: string;
  status: "pending" | "rejected";
}

interface ConsumerRow {
  consumer_id: number;
  name: string;
  user_id: number | null;
  email: string | null;
  mobile_number: string | null;
  is_admin: number | null;
  account_deleted_at: string | null;
  updated_at: number;
}

const consumerCollection = "reference_consumers";
const consumerScopeKey = (userId: number, messId: number) =>
  `${userId}:${messId}:${consumerCollection}`;

export class ReferenceDataRepository implements ReferenceDataStore {
  constructor(private readonly database: SQLiteDatabase) {}

  async getAuthSnapshot(): Promise<LocalAuthSnapshot | null> {
    const session = await this.database.getFirstAsync<SessionRow>(
      `SELECT
        s.user_id,
        s.active_mess_id,
        s.updated_at AS saved_at,
        u.email,
        u.name,
        u.mobile_number
       FROM local_session s
       INNER JOIN reference_users u ON u.user_id = s.user_id
       WHERE s.singleton_id = 1`,
    );
    if (!session) return null;

    const [messRows, requestRows] = await Promise.all([
      this.database.getAllAsync<MessRow>(
        `SELECT m.mess_id, m.name, m.mess_key, membership.role
         FROM reference_memberships membership
         INNER JOIN reference_messes m ON m.mess_id = membership.mess_id
         WHERE membership.user_id = ?
         ORDER BY m.mess_id ASC`,
        session.user_id,
      ),
      this.database.getAllAsync<RequestRow>(
        `SELECT request_id, mess_id, mess_name, status
         FROM reference_member_requests
         WHERE user_id = ?
         ORDER BY request_id ASC`,
        session.user_id,
      ),
    ]);

    const user: ApiUser = {
      id: session.user_id,
      email: session.email,
      name: session.name,
      mobileNumber: session.mobile_number,
    };
    const messes: ApiMessWithRole[] = messRows.map((row) => ({
      id: row.mess_id,
      name: row.name,
      messKey: row.mess_key,
      role: row.role,
    }));
    const requests: ApiMyRequest[] = requestRows.map((row) => ({
      id: row.request_id,
      messId: row.mess_id,
      messName: row.mess_name,
      status: row.status,
    }));
    const activeMess =
      messes.find((mess) => mess.id === session.active_mess_id) ?? null;

    return {
      me: { user, messes, requests },
      activeMess,
      savedAt: session.saved_at,
    };
  }

  async replaceAuthSnapshot(
    me: { user: ApiUser; messes: ApiMessWithRole[]; requests: ApiMyRequest[] },
    activeMessId?: number | null,
  ): Promise<LocalAuthSnapshot> {
    const now = Date.now();
    const current = await this.database.getFirstAsync<{
      active_mess_id: number | null;
    }>("SELECT active_mess_id FROM local_session WHERE singleton_id = 1");
    const previousMemberships = await this.database.getAllAsync<{
      mess_id: number;
    }>(
      "SELECT mess_id FROM reference_memberships WHERE user_id = ?",
      me.user.id,
    );
    const incomingMessIds = new Set(me.messes.map((mess) => mess.id));
    const revokedMessIds = previousMemberships
      .map((membership) => membership.mess_id)
      .filter((messId) => !incomingMessIds.has(messId));
    const selectedId =
      activeMessId === undefined
        ? (current?.active_mess_id ?? null)
        : activeMessId;
    const validActiveMessId = me.messes.some((mess) => mess.id === selectedId)
      ? selectedId
      : null;

    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO reference_users (
          user_id, email, name, mobile_number, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          mobile_number = excluded.mobile_number,
          updated_at = excluded.updated_at`,
        me.user.id,
        me.user.email,
        me.user.name,
        me.user.mobileNumber ?? null,
        now,
      );

      await this.database.runAsync(
        "DELETE FROM reference_memberships WHERE user_id = ?",
        me.user.id,
      );
      for (const mess of me.messes) {
        await this.database.runAsync(
          `INSERT INTO reference_messes (mess_id, name, mess_key, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(mess_id) DO UPDATE SET
             name = excluded.name,
             mess_key = excluded.mess_key,
             updated_at = excluded.updated_at`,
          mess.id,
          mess.name,
          mess.messKey,
          now,
        );
        await this.database.runAsync(
          `INSERT INTO reference_memberships (user_id, mess_id, role, updated_at)
           VALUES (?, ?, ?, ?)`,
          me.user.id,
          mess.id,
          mess.role,
          now,
        );
      }

      await this.database.runAsync(
        "DELETE FROM reference_member_requests WHERE user_id = ?",
        me.user.id,
      );
      for (const request of me.requests) {
        await this.database.runAsync(
          `INSERT INTO reference_member_requests (
            request_id, user_id, mess_id, mess_name, status, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          request.id,
          me.user.id,
          request.messId,
          request.messName,
          request.status,
          now,
        );
      }

      for (const revokedMessId of revokedMessIds) {
        await this.database.runAsync(
          "DELETE FROM reference_consumers WHERE mess_id = ?",
          revokedMessId,
        );
        await this.database.runAsync(
          "DELETE FROM offline_outbox WHERE user_id = ? AND mess_id = ?",
          me.user.id,
          revokedMessId,
        );
        await this.database.runAsync(
          "DELETE FROM sync_state WHERE user_id = ? AND mess_id = ?",
          me.user.id,
          revokedMessId,
        );
      }

      await this.database.runAsync(
        `INSERT INTO local_session (
          singleton_id, user_id, active_mess_id, updated_at
        ) VALUES (1, ?, ?, ?)
        ON CONFLICT(singleton_id) DO UPDATE SET
          user_id = excluded.user_id,
          active_mess_id = excluded.active_mess_id,
          updated_at = excluded.updated_at`,
        me.user.id,
        validActiveMessId,
        now,
      );
    });

    return {
      me,
      activeMess:
        me.messes.find((mess) => mess.id === validActiveMessId) ?? null,
      savedAt: now,
    };
  }

  async setActiveMess(userId: number, messId: number | null): Promise<void> {
    if (messId !== null) {
      const membership = await this.database.getFirstAsync<{ found: number }>(
        `SELECT 1 AS found FROM reference_memberships
         WHERE user_id = ? AND mess_id = ?`,
        userId,
        messId,
      );
      if (!membership) throw new Error("The selected mess is not cached.");
    }
    await this.database.runAsync(
      `UPDATE local_session
       SET active_mess_id = ?, updated_at = ?
       WHERE singleton_id = 1 AND user_id = ?`,
      messId,
      Date.now(),
      userId,
    );
  }

  async getConsumers(
    userId: number,
    messId: number,
  ): Promise<LocalConsumerSnapshot | null> {
    const syncState = await this.database.getFirstAsync<{
      last_synced_at: number | null;
    }>(
      `SELECT state.last_synced_at
       FROM sync_state state
       INNER JOIN reference_memberships membership
         ON membership.user_id = state.user_id
        AND membership.mess_id = state.mess_id
       WHERE state.scope_key = ?
         AND membership.user_id = ?
         AND membership.mess_id = ?`,
      consumerScopeKey(userId, messId),
      userId,
      messId,
    );
    if (!syncState) return null;

    const rows = await this.database.getAllAsync<ConsumerRow>(
      `SELECT * FROM reference_consumers
       WHERE mess_id = ?
       ORDER BY consumer_id ASC`,
      messId,
    );
    return {
      consumers: rows.map((row) => ({
        id: row.consumer_id,
        name: row.name,
        userId: row.user_id,
        email: row.email,
        mobileNumber: row.mobile_number,
        isAdmin: row.is_admin === null ? null : row.is_admin === 1,
        accountDeletedAt: row.account_deleted_at,
      })),
      savedAt: Number(syncState.last_synced_at ?? 0),
    };
  }

  async replaceConsumers(
    userId: number,
    messId: number,
    consumers: ApiConsumer[],
  ): Promise<LocalConsumerSnapshot> {
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      const membership = await this.database.getFirstAsync<{ found: number }>(
        `SELECT 1 AS found FROM reference_memberships
         WHERE user_id = ? AND mess_id = ?`,
        userId,
        messId,
      );
      if (!membership)
        throw new Error("Cannot cache consumers without mess access.");

      await this.database.runAsync(
        "DELETE FROM reference_consumers WHERE mess_id = ?",
        messId,
      );
      for (const consumer of consumers) {
        await this.database.runAsync(
          `INSERT INTO reference_consumers (
            consumer_id, mess_id, name, user_id, email, mobile_number,
            is_admin, account_deleted_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          consumer.id,
          messId,
          consumer.name,
          consumer.userId ?? null,
          consumer.email ?? null,
          consumer.mobileNumber ?? null,
          consumer.isAdmin == null ? null : consumer.isAdmin ? 1 : 0,
          consumer.accountDeletedAt ?? null,
          now,
        );
      }
      await this.database.runAsync(
        `INSERT INTO sync_state (
          scope_key, user_id, mess_id, collection, cursor,
          last_synced_at, last_error, updated_at
        ) VALUES (?, ?, ?, ?, NULL, ?, NULL, ?)
        ON CONFLICT(scope_key) DO UPDATE SET
          last_synced_at = excluded.last_synced_at,
          last_error = NULL,
          updated_at = excluded.updated_at`,
        consumerScopeKey(userId, messId),
        userId,
        messId,
        consumerCollection,
        now,
        now,
      );
    });
    return { consumers, savedAt: now };
  }

  async patchUser(userId: number, update: Partial<ApiUser>): Promise<void> {
    const current = await this.database.getFirstAsync<{
      email: string;
      name: string;
      mobile_number: string | null;
    }>(
      "SELECT email, name, mobile_number FROM reference_users WHERE user_id = ?",
      userId,
    );
    if (!current) return;
    const email = update.email ?? current.email;
    const name = update.name ?? current.name;
    const mobileNumber =
      update.mobileNumber === undefined
        ? current.mobile_number
        : update.mobileNumber;
    const now = Date.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `UPDATE reference_users
         SET email = ?, name = ?, mobile_number = ?, updated_at = ?
         WHERE user_id = ?`,
        email,
        name,
        mobileNumber,
        now,
        userId,
      );
      await this.database.runAsync(
        `UPDATE reference_consumers
         SET name = ?, email = ?, mobile_number = ?, updated_at = ?
         WHERE user_id = ?`,
        name,
        email,
        mobileNumber,
        now,
        userId,
      );
    });
  }

  async patchMess(
    messId: number,
    update: Partial<ApiMessWithRole>,
  ): Promise<void> {
    const current = await this.database.getFirstAsync<{
      name: string;
      mess_key: string;
    }>("SELECT name, mess_key FROM reference_messes WHERE mess_id = ?", messId);
    if (!current) return;
    await this.database.runAsync(
      `UPDATE reference_messes
       SET name = ?, mess_key = ?, updated_at = ?
       WHERE mess_id = ?`,
      update.name ?? current.name,
      update.messKey ?? current.mess_key,
      Date.now(),
      messId,
    );
  }

  async clear(): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      await this.database.execAsync(`
        DELETE FROM offline_outbox;
        DELETE FROM sync_state;
        DELETE FROM local_session;
        DELETE FROM reference_consumers;
        DELETE FROM reference_member_requests;
        DELETE FROM reference_memberships;
        DELETE FROM reference_messes;
        DELETE FROM reference_users;
      `);
    });
  }
}
