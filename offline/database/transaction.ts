import type { SQLiteDatabase } from "expo-sqlite";

/**
 * expo-sqlite's `withTransactionAsync` is a bare BEGIN/COMMIT pair on a shared
 * connection with no locking of its own. When two calls overlap — a tap writing
 * while a sync pull is mid-flight, say — the second BEGIN fails with "cannot
 * start a transaction within a transaction", and the rollback in its catch
 * tears down the first transaction as well. Both callers then see an error for
 * work that was perfectly valid.
 *
 * Queueing per connection removes the overlap: each transaction waits for the
 * previous one to settle before it begins. Callers must not call back into this
 * helper from inside a task, which would wait on itself forever.
 */
const queues = new WeakMap<SQLiteDatabase, Promise<unknown>>();

export function runInTransaction<T>(
  database: SQLiteDatabase,
  task: () => Promise<T>,
): Promise<T> {
  const execute = async (): Promise<T> => {
    const holder: { value?: T } = {};
    await database.withTransactionAsync(async () => {
      holder.value = await task();
    });
    return holder.value as T;
  };

  const previous = queues.get(database) ?? Promise.resolve();
  // A failed transaction must not poison the ones queued behind it.
  const running = previous.then(execute, execute);
  queues.set(
    database,
    running.then(
      () => undefined,
      () => undefined,
    ),
  );
  return running;
}
