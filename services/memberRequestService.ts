import { api, ApiError } from "@/lib/api";
import { getOfflineDatabase } from "@/offline/database/connection";
import { OutboxRepository } from "@/offline/repositories/outboxRepository";

export const getMemberRequests = async (token: string, messId: number) => {
  const { requests } = await api.getMemberRequests(token, messId);
  return requests;
};

const resolveMemberRequest = async (
  action: "accept" | "reject",
  requestId: number,
  context: {
    token: string;
    userId: number;
    messId: number;
    isOnline: boolean;
  },
) => {
  if (context.isOnline) {
    try {
      return action === "accept"
        ? await api.acceptMemberRequest(requestId, context.token)
        : await api.rejectMemberRequest(requestId, context.token);
    } catch (error) {
      const connectivityFailure =
        error instanceof ApiError
          ? error.status === 408
          : error instanceof TypeError &&
            /network|fetch|connection|load/i.test(error.message);
      if (!connectivityFailure) throw error;
    }
  }
  await new OutboxRepository(await getOfflineDatabase()).enqueue({
    userId: context.userId,
    messId: context.messId,
    entityType: "member_request",
    entityId: String(requestId),
    operation: "command",
    payload: { action, requestId },
    dedupeKey: `member-request:${context.messId}:${requestId}`,
  });
  return { queued: true };
};

export const acceptMemberRequest = (
  requestId: number,
  context: Parameters<typeof resolveMemberRequest>[2],
) => resolveMemberRequest("accept", requestId, context);

export const rejectMemberRequest = (
  requestId: number,
  context: Parameters<typeof resolveMemberRequest>[2],
) => resolveMemberRequest("reject", requestId, context);
