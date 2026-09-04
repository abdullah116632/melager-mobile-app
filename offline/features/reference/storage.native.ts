import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  ApiConsumer,
  ApiMessWithRole,
  ApiUser,
  MeAuthResponse,
} from "@/lib/api";
import { ACTIVE_MESS_KEY, AUTH_CACHE_KEY } from "@/storage/session/constants";

import { getOfflineDatabase } from "../../database/connection";
import { ReferenceDataRepository } from "./ReferenceDataRepository";
import type { LocalAuthSnapshot, LocalConsumerSnapshot } from "./types";

const getRepository = async () =>
  new ReferenceDataRepository(await getOfflineDatabase());

export async function getLocalAuthSnapshot(): Promise<LocalAuthSnapshot | null> {
  const repository = await getRepository();
  const snapshot = await repository.getAuthSnapshot();
  if (snapshot) return snapshot;

  // One-time migration from the pre-SQLite session cache.
  const values = await AsyncStorage.multiGet([AUTH_CACHE_KEY, ACTIVE_MESS_KEY]);
  const cachedRaw = values[0]?.[1];
  if (!cachedRaw) return null;
  try {
    const me = JSON.parse(cachedRaw) as MeAuthResponse;
    if (!me.user || !Array.isArray(me.messes) || !Array.isArray(me.requests)) {
      return null;
    }
    const activeMessId = Number(values[1]?.[1] ?? 0) || null;
    const migrated = await repository.replaceAuthSnapshot(me, activeMessId);
    await AsyncStorage.multiRemove([AUTH_CACHE_KEY, ACTIVE_MESS_KEY]);
    return migrated;
  } catch {
    return null;
  }
}

export async function saveLocalAuthSnapshot(
  me: MeAuthResponse,
  activeMessId?: number | null,
): Promise<LocalAuthSnapshot> {
  const repository = await getRepository();
  const current = await repository.getAuthSnapshot();
  if (current && current.me.user.id !== me.user.id) {
    // A shared device must never expose the previous account's cached data.
    await repository.clear();
  }
  const snapshot = await repository.replaceAuthSnapshot(me, activeMessId);
  await AsyncStorage.multiRemove([AUTH_CACHE_KEY, ACTIVE_MESS_KEY]);
  return snapshot;
}

export async function setLocalActiveMess(
  userId: number,
  messId: number | null,
): Promise<void> {
  await (await getRepository()).setActiveMess(userId, messId);
}

export async function getLocalConsumers(
  userId: number,
  messId: number,
): Promise<LocalConsumerSnapshot | null> {
  return (await getRepository()).getConsumers(userId, messId);
}

export async function saveLocalConsumers(
  userId: number,
  messId: number,
  consumers: ApiConsumer[],
): Promise<LocalConsumerSnapshot> {
  return (await getRepository()).replaceConsumers(userId, messId, consumers);
}

export async function patchLocalUser(
  userId: number,
  update: Partial<ApiUser>,
): Promise<void> {
  await (await getRepository()).patchUser(userId, update);
}

export async function patchLocalMess(
  messId: number,
  update: Partial<ApiMessWithRole>,
): Promise<void> {
  await (await getRepository()).patchMess(messId, update);
}

export async function clearLocalReferenceData(): Promise<void> {
  await (await getRepository()).clear();
  await AsyncStorage.multiRemove([AUTH_CACHE_KEY, ACTIVE_MESS_KEY]);
}
