import { api } from "@/lib/api";

import type { SyncRegistry } from "../../sync/registry";
import { ReferenceDataRepository } from "./ReferenceDataRepository";
import type { SQLiteDatabase } from "expo-sqlite";

export function registerReferenceSync(
  registry: SyncRegistry,
  database: SQLiteDatabase,
): void {
  const repository = new ReferenceDataRepository(database);

  registry.registerProcessor(
    "reference_consumer",
    async (operation, context) => {
      const payload = operation.payload as {
        consumerId?: number;
        name?: string;
        email?: string;
        mobileNumber?: string | null;
      };
      if (operation.operation === "create") {
        if (!payload.name || !payload.email)
          throw new Error("Consumer data is incomplete.");
        await api.addConsumer(
          payload.name,
          payload.email,
          payload.mobileNumber ?? undefined,
          context.token,
          context.messId!,
        );
      } else if (operation.operation === "delete" && payload.consumerId) {
        await api.removeConsumer(
          payload.consumerId,
          context.token,
          context.messId!,
        );
      } else {
        throw new Error("Unsupported consumer operation.");
      }
      const result = await api.getConsumers(context.token, context.messId!);
      await repository.replaceConsumers(
        context.userId,
        context.messId!,
        result.consumers,
      );
    },
  );

  registry.registerProcessor("mess_command", async (operation, context) => {
    const payload = operation.payload as {
      action?: "join" | "retry_join";
      name?: string;
      existingMessIds?: number[];
      messKey?: string;
      requestId?: number;
    };
    if (operation.operation === "create" && payload.name) {
      if (operation.attemptCount > 0) {
        const me = await api.me(context.token);
        const baseline = new Set(payload.existingMessIds ?? []);
        const alreadyCreated = me.messes.some(
          (mess) =>
            mess.role === "admin" &&
            mess.name === payload.name &&
            !baseline.has(mess.id),
        );
        if (alreadyCreated) return;
      }
      await api.createMessV2(payload.name, context.token);
    } else if (payload.action === "join" && payload.messKey) {
      await api.joinMess(payload.messKey, context.token);
    } else if (payload.action === "retry_join" && payload.requestId) {
      await api.retryJoin(payload.requestId, context.token);
    } else {
      throw new Error("Unsupported mess operation.");
    }
  });

  registry.registerProcessor("member_request", async (operation, context) => {
    const payload = operation.payload as {
      action?: "accept" | "reject";
      requestId?: number;
    };
    if (!payload.requestId) throw new Error("Member request id is missing.");
    if (payload.action === "accept") {
      await api.acceptMemberRequest(payload.requestId, context.token);
    } else if (payload.action === "reject") {
      await api.rejectMemberRequest(payload.requestId, context.token);
    } else {
      throw new Error("Unsupported member request operation.");
    }
  });

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
