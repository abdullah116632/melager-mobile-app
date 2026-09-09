type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Fired whenever the number of rows in `offline_outbox` can have changed.
 *
 * The outbox is written through short-lived `OutboxRepository` instances all
 * over the app, so a repository-level callback would need threading through
 * every call site. A module-level notifier lets the UI observe the queue
 * without any of those writers knowing that somebody is listening.
 */
export function notifyOutboxChanged(): void {
  for (const listener of [...listeners]) {
    try {
      listener();
    } catch {
      // A failing observer must never break the write that triggered it.
    }
  }
}

export function subscribeToOutboxChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
