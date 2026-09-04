import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApiBazarAssignment, ApiBazarItem, ApiConsumer, ApiNotice, MonthData } from "@/lib/api";
import type { DashboardDateRange } from "@/types/dashboard";
import type { Consumer } from "@/types/mess";

const PREFIX = "@mess_cache:";
const DEPOSIT_ENTRIES_PREFIX = "@mess_deposit_entries:";
const CONSUMER_BREAKDOWN_PREFIX = "@mess_consumer_breakdown:";
const NOTICES_PREFIX = "@mess_notices:";
const BAZAR_PREFIX = "@mess_bazar:";
const memoryCache = new Map<string, unknown>();

export interface ConsumerBreakdownCacheData {
  appliedRange: DashboardDateRange | null;
  rangeData: Record<string, MonthData>;
  consumers: Consumer[];
}

export interface BazarCacheData {
  items: ApiBazarItem[];
  assignments: ApiBazarAssignment[];
  consumers: ApiConsumer[];
}

function cacheKey(messId: number, yearMonth: string): string {
  return `${PREFIX}${messId}:${yearMonth}`;
}

function depositEntriesCacheKey(messId: number, yearMonth: string): string {
  return `${DEPOSIT_ENTRIES_PREFIX}${messId}:${yearMonth}`;
}

function consumerBreakdownCacheKey(messId: number): string {
  return `${CONSUMER_BREAKDOWN_PREFIX}${messId}`;
}

function noticesCacheKey(messId: number): string {
  return `${NOTICES_PREFIX}${messId}`;
}

function bazarCacheKey(messId: number): string {
  return `${BAZAR_PREFIX}${messId}`;
}

export async function saveBazarToCache(messId: number, data: BazarCacheData): Promise<void> {
  const key = bazarCacheKey(messId);
  memoryCache.set(key, data);
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {}
}

export async function loadBazarFromCache(messId: number): Promise<BazarCacheData | null> {
  const key = bazarCacheKey(messId);
  const inMemory = memoryCache.get(key);
  if (inMemory) return inMemory as BazarCacheData;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const data = (JSON.parse(raw) as { data?: Partial<BazarCacheData> }).data;
    if (!data || !Array.isArray(data.items) || !Array.isArray(data.assignments) || !Array.isArray(data.consumers)) return null;
    const cached = data as BazarCacheData;
    memoryCache.set(key, cached);
    return cached;
  } catch {
    return null;
  }
}

export async function saveNoticesToCache(
  messId: number,
  notices: ApiNotice[],
): Promise<void> {
  const key = noticesCacheKey(messId);
  memoryCache.set(key, notices);
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ notices, savedAt: Date.now() }),
    );
  } catch {}
}

export async function loadNoticesFromCache(
  messId: number,
): Promise<ApiNotice[] | null> {
  const key = noticesCacheKey(messId);
  const inMemory = memoryCache.get(key);
  if (Array.isArray(inMemory)) return inMemory as ApiNotice[];
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { notices?: unknown };
    if (!Array.isArray(parsed.notices)) return null;
    const notices = parsed.notices as ApiNotice[];
    memoryCache.set(key, notices);
    return notices;
  } catch {
    return null;
  }
}

export async function saveConsumerBreakdownToCache(
  messId: number,
  data: ConsumerBreakdownCacheData,
): Promise<void> {
  const key = consumerBreakdownCacheKey(messId);
  memoryCache.set(key, data);
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ data, savedAt: Date.now() }),
    );
  } catch {}
}

export async function loadConsumerBreakdownFromCache(
  messId: number,
): Promise<ConsumerBreakdownCacheData | null> {
  const key = consumerBreakdownCacheKey(messId);
  const inMemory = memoryCache.get(key);
  if (inMemory) return inMemory as ConsumerBreakdownCacheData;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      data?: Partial<ConsumerBreakdownCacheData>;
    };
    const data = parsed.data;
    if (!data || !Array.isArray(data.consumers)) return null;
    const normalized: ConsumerBreakdownCacheData = {
      appliedRange: data.appliedRange ?? null,
      rangeData:
        data.rangeData && typeof data.rangeData === "object"
          ? data.rangeData
          : {},
      consumers: data.consumers,
    };
    memoryCache.set(key, normalized);
    return normalized;
  } catch {
    return null;
  }
}

export async function saveDepositEntriesToCache(
  messId: number,
  yearMonth: string,
  entries: unknown,
): Promise<void> {
  const key = depositEntriesCacheKey(messId, yearMonth);
  memoryCache.set(key, entries);
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ entries, savedAt: Date.now() }),
    );
  } catch {}
}

export async function loadDepositEntriesFromCache(
  messId: number,
  yearMonth: string,
): Promise<unknown[] | null> {
  const key = depositEntriesCacheKey(messId, yearMonth);
  const inMemory = memoryCache.get(key);
  if (Array.isArray(inMemory)) return inMemory;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { entries?: unknown };
    if (!Array.isArray(parsed.entries)) return null;
    memoryCache.set(key, parsed.entries);
    return parsed.entries;
  } catch {
    return null;
  }
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
