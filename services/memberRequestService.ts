import { api } from "@/lib/api";

export const getMemberRequests = async (token: string, messId: number) => {
  const { requests } = await api.getMemberRequests(token, messId);
  return requests;
};

export const acceptMemberRequest = (requestId: number, token: string) =>
  api.acceptMemberRequest(requestId, token);

export const rejectMemberRequest = (requestId: number, token: string) =>
  api.rejectMemberRequest(requestId, token);
