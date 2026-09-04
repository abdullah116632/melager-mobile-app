import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ApiMessWithRole, ApiMyRequest, ApiUser } from "@/lib/api";

import { ACTIVE_MESS_KEY, AUTH_CACHE_KEY } from "./constants";
import { getSessionToken } from "./tokenStorage";

interface PersistedAuthProfile {
  user: ApiUser;
  messes: ApiMessWithRole[];
  requests: ApiMyRequest[];
}

export interface PersistedSyncSession {
  token: string;
  userId: number;
  messId: number | null;
}

export async function getPersistedSyncSession(): Promise<PersistedSyncSession | null> {
  const [token, values] = await Promise.all([
    getSessionToken(),
    AsyncStorage.multiGet([AUTH_CACHE_KEY, ACTIVE_MESS_KEY]),
  ]);
  if (!token) return null;

  const profileRaw = values[0]?.[1];
  if (!profileRaw) return null;

  try {
    const profile = JSON.parse(profileRaw) as PersistedAuthProfile;
    if (!Number.isInteger(profile.user?.id)) return null;

    const activeMessId = Number(values[1]?.[1] ?? 0) || null;
    const messId = profile.messes.some((mess) => mess.id === activeMessId)
      ? activeMessId
      : null;
    return { token, userId: profile.user.id, messId };
  } catch {
    return null;
  }
}
