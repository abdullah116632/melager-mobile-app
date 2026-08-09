import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@mess_cache:';
const memoryCache = new Map<string, unknown>();

function cacheKey(messId: number, yearMonth: string): string {
  return `${PREFIX}${messId}:${yearMonth}`;
}

export async function saveToCache(messId: number, yearMonth: string, data: unknown): Promise<void> {
  const key = cacheKey(messId, yearMonth);
  memoryCache.set(key, data);
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ data, savedAt: Date.now() }),
    );
  } catch {}
}

export async function loadFromCache(messId: number, yearMonth: string): Promise<unknown | null> {
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
