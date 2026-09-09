import AsyncStorage from "@react-native-async-storage/async-storage";

// All mutations now live in the account-scoped SQLite outbox. Older builds
// stored bearer tokens beside legacy AsyncStorage operations; purge that data
// instead of ever loading or replaying credentials from plaintext storage.
const LEGACY_QUEUE_KEY = "@mess_offline_queue";

const purgeLegacyQueue = AsyncStorage.removeItem(LEGACY_QUEUE_KEY).catch(
  () => undefined,
);

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_QUEUE_KEY).catch(() => undefined);
}

/**
 * Only drains the retired AsyncStorage queue. The pending count and the actual
 * sync now come from the SQLite outbox, so this always reports zero synced
 * operations and exists to finish cleaning up upgraded installs.
 */
export async function flushQueue(): Promise<number> {
  await purgeLegacyQueue;
  return 0;
}
