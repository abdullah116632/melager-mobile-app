import { api } from "@/lib/api";

import type { SyncRegistry } from "../../sync/registry";
import { ReferenceDataRepository } from "./ReferenceDataRepository";
import type { SQLiteDatabase } from "expo-sqlite";

export function registerReferenceSync(
  registry: SyncRegistry,
  database: SQLiteDatabase,
): void {
  const repository = new ReferenceDataRepository(database);

  registry.registerPuller("reference_data", async (_cursor, context) => {
    const me = await api.me(context.token);
    if (me.user.id !== context.userId) {
      throw new Error(
        "The local session does not match the authenticated user.",
      );
    }

    const authSnapshot = await repository.replaceAuthSnapshot(
      me,
      context.messId,
    );
    const activeMessId = authSnapshot.activeMess?.id ?? null;
    if (activeMessId !== null) {
      const result = await api.getConsumers(context.token, activeMessId);
      await repository.replaceConsumers(
        context.userId,
        activeMessId,
        result.consumers,
      );
    }

    return { cursor: String(Date.now()) };
  });
}
