type ManualSyncHandler = () => Promise<void>;

let handler: ManualSyncHandler | null = null;

/**
 * Lets the retry button in `OfflineBanner` reach the sync that
 * `OfflineSyncController` owns.
 *
 * The controller's own sync also re-hydrates Redux from SQLite afterwards, so
 * routing through it keeps a manual retry and an automatic one identical. Web
 * never registers a handler, which leaves the retry a no-op exactly as before.
 */
export function setManualSyncHandler(next: ManualSyncHandler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

export async function runManualSync(): Promise<void> {
  await handler?.();
}
