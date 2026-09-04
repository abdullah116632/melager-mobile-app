import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  ApiConsumer,
  ApiMessWithRole,
  ApiUser,
  MeAuthResponse,
} from "@/lib/api";
import { ACTIVE_MESS_KEY, AUTH_CACHE_KEY } from "@/storage/session/constants";

import type { LocalAuthSnapshot, LocalConsumerSnapshot } from "./types";

const CONSUMERS_PREFIX = "@mess_reference_consumers:";
const consumersKey = (userId: number, messId: number) =>
  `${CONSUMERS_PREFIX}${userId}:${messId}`;

export async function getLocalAuthSnapshot(): Promise<LocalAuthSnapshot | null> {
  const values = await AsyncStorage.multiGet([AUTH_CACHE_KEY, ACTIVE_MESS_KEY]);
  if (!values[0]?.[1]) return null;
  try {
    const me = JSON.parse(values[0][1]) as MeAuthResponse;
    const activeMessId = Number(values[1]?.[1] ?? 0) || null;
    return {
      me,
      activeMess: me.messes.find((mess) => mess.id === activeMessId) ?? null,
      savedAt: 0,
    };
  } catch {
    return null;
  }
}

export async function saveLocalAuthSnapshot(
  me: MeAuthResponse,
  activeMessId?: number | null,
): Promise<LocalAuthSnapshot> {
  const current = await getLocalAuthSnapshot();
  if (current && current.me.user.id !== me.user.id) {
    await clearLocalReferenceData();
  }
  const currentActiveId =
    activeMessId === undefined
      ? Number(await AsyncStorage.getItem(ACTIVE_MESS_KEY)) || null
      : activeMessId;
  const activeMess =
    me.messes.find((mess) => mess.id === currentActiveId) ?? null;
  const writes: Promise<void>[] = [
    AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(me)),
  ];
  writes.push(
    activeMess
      ? AsyncStorage.setItem(ACTIVE_MESS_KEY, String(activeMess.id))
      : AsyncStorage.removeItem(ACTIVE_MESS_KEY),
  );
  await Promise.all(writes);
  return { me, activeMess, savedAt: Date.now() };
}

export async function setLocalActiveMess(
  _userId: number,
  messId: number | null,
): Promise<void> {
  if (messId === null) await AsyncStorage.removeItem(ACTIVE_MESS_KEY);
  else await AsyncStorage.setItem(ACTIVE_MESS_KEY, String(messId));
}

export async function getLocalConsumers(
  userId: number,
  messId: number,
): Promise<LocalConsumerSnapshot | null> {
  const raw = await AsyncStorage.getItem(consumersKey(userId, messId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalConsumerSnapshot;
  } catch {
    return null;
  }
}

export async function saveLocalConsumers(
  userId: number,
  messId: number,
  consumers: ApiConsumer[],
): Promise<LocalConsumerSnapshot> {
  const snapshot = { consumers, savedAt: Date.now() };
  await AsyncStorage.setItem(
    consumersKey(userId, messId),
    JSON.stringify(snapshot),
  );
  return snapshot;
}

export async function patchLocalUser(
  userId: number,
  update: Partial<ApiUser>,
): Promise<void> {
  const snapshot = await getLocalAuthSnapshot();
  if (!snapshot || snapshot.me.user.id !== userId) return;
  await saveLocalAuthSnapshot(
    { ...snapshot.me, user: { ...snapshot.me.user, ...update } },
    snapshot.activeMess?.id ?? null,
  );
}

export async function patchLocalMess(
  messId: number,
  update: Partial<ApiMessWithRole>,
): Promise<void> {
  const snapshot = await getLocalAuthSnapshot();
  if (!snapshot) return;
  await saveLocalAuthSnapshot(
    {
      ...snapshot.me,
      messes: snapshot.me.messes.map((mess) =>
        mess.id === messId ? { ...mess, ...update } : mess,
      ),
    },
    snapshot.activeMess?.id ?? null,
  );
}

export async function clearLocalReferenceData(): Promise<void> {
  const consumerKeys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith(CONSUMERS_PREFIX),
  );
  await AsyncStorage.multiRemove([
    AUTH_CACHE_KEY,
    ACTIVE_MESS_KEY,
    ...consumerKeys,
  ]);
}
