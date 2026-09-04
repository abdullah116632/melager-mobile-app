import { getLocalAuthSnapshot } from "@/offline/features/reference/storage";

import { getSessionToken } from "./tokenStorage";

export interface PersistedSyncSession {
  token: string;
  userId: number;
  messId: number | null;
}

export async function getPersistedSyncSession(): Promise<PersistedSyncSession | null> {
  const [token, snapshot] = await Promise.all([
    getSessionToken(),
    getLocalAuthSnapshot(),
  ]);
  if (!token || !snapshot) return null;
  return {
    token,
    userId: snapshot.me.user.id,
    messId: snapshot.activeMess?.id ?? null,
  };
}
