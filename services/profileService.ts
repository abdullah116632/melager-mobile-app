import { api } from "@/lib/api";

export const sendMessInvite = async (
  messId: number,
  email: string,
  token: string,
) => api.inviteByEmail(messId, email, token);
