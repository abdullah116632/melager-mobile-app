import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "@mess_cache:";
const memoryCache = new Map<string, unknown>();

function cacheKey(messId: number, yearMonth: string): string {
  return `${PREFIX}${messId}:${yearMonth}`;
}

export async function saveToCache(
  messId: number,
  yearMonth: string,
  data: unknown,
): Promise<void> {
  const key = cacheKey(messId, yearMonth);
  memoryCache.set(key, data);
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ data, savedAt: Date.now() }),
    );
  } catch {}
}

export async function loadFromCache(
  messId: number,
  yearMonth: string,
): Promise<unknown | null> {
  const key = cacheKey(messId, yearMonth);
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: unknown };
    memoryCache.set(key, parsed.data);
    return parsed.data;
  } catch {
    return null;
  }
}

type CachedConsumerProfileUpdate = {
  userId: number;
  email: string;
  name: string;
};

const patchConsumerProfile = (
  data: unknown,
  update: CachedConsumerProfileUpdate,
): { data: unknown; changed: boolean } => {
  if (!data || typeof data !== "object") return { data, changed: false };
  const monthData = data as { consumers?: unknown };
  if (!Array.isArray(monthData.consumers)) return { data, changed: false };

  let changed = false;
  const normalizedEmail = update.email.trim().toLowerCase();
  const consumers = monthData.consumers.map((consumer) => {
    if (!consumer || typeof consumer !== "object") return consumer;
    const record = consumer as {
      userId?: unknown;
      email?: unknown;
      name?: unknown;
    };
    const matchesUserId = Number(record.userId) === update.userId;
    const matchesEmail =
      typeof record.email === "string" &&
      record.email.trim().toLowerCase() === normalizedEmail;
    if (!matchesUserId && !matchesEmail) return consumer;
    changed = true;
    return { ...record, name: update.name };
  });

  return changed
    ? { data: { ...monthData, consumers }, changed: true }
    : { data, changed: false };
};

export async function patchCachedConsumerProfile(
  update: CachedConsumerProfileUpdate,
): Promise<void> {
  for (const [key, data] of memoryCache.entries()) {
    if (!key.startsWith(PREFIX)) continue;
    const patched = patchConsumerProfile(data, update);
    if (patched.changed) memoryCache.set(key, patched.data);
  }

  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
      key.startsWith(PREFIX),
    );
    const cachedEntries = await AsyncStorage.multiGet(keys);
    const updates: Array<[string, string]> = [];

    for (const [key, raw] of cachedEntries) {
      if (!raw) continue;
      const stored = JSON.parse(raw) as { data?: unknown; savedAt?: number };
      const patched = patchConsumerProfile(stored.data, update);
      if (!patched.changed) continue;
      updates.push([key, JSON.stringify({ ...stored, data: patched.data })]);
    }

    if (updates.length > 0) await AsyncStorage.multiSet(updates);
  } catch {
    // The in-memory state is still updated even if persisted cache is unavailable.
  }
}
