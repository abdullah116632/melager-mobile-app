import AsyncStorage from "@react-native-async-storage/async-storage";

// All mutations now live in the account-scoped SQLite outbox. Older builds
// stored bearer tokens beside legacy AsyncStorage operations; purge that data
// instead of ever loading or replaying credentials from plaintext storage.
const LEGACY_QUEUE_KEY = "@mess_offline_queue";
type Listener = (count: number) => void;
const listeners = new Set<Listener>();

const purgeLegacyQueue = AsyncStorage.removeItem(LEGACY_QUEUE_KEY)
  .catch(() => undefined)
  .finally(() => listeners.forEach((listener) => listener(0)));

export function subscribeQueueSize(listener: Listener): () => void {
  void purgeLegacyQueue.then(() => listener(0));
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getQueueSize(): number {
  return 0;
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_QUEUE_KEY).catch(() => undefined);
  listeners.forEach((listener) => listener(0));
}

/** Kept until the legacy Redux indicator is removed. SQLite sync owns work. */
export async function flushQueue(): Promise<number> {
  await purgeLegacyQueue;
  return 0;
}
