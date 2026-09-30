/**
 * Coming back to the app normally refreshes everything from local storage
 * and runs a full sync. A system picker also sends the app to the background
 * for a few seconds, and that refresh then competes with the file being sent:
 * its message waited behind the full sync. A picker opened by the app marks
 * its round trip here so the return is not treated as a fresh visit.
 */

/** A picker left open longer than this counts as a real visit elsewhere. */
const MAX_TRIP_MS = 5 * 60_000;
const CLEAR_AFTER_RETURN_MS = 2_000;

let tripStartedAt: number | null = null;

/** Runs a system picker without triggering the return-to-app refresh. */
export const withoutForegroundRefresh = async <T>(
  openPicker: () => Promise<T>,
): Promise<T> => {
  tripStartedAt = Date.now();
  try {
    return await openPicker();
  } finally {
    // The "active" event may arrive just after the picker resolves.
    setTimeout(() => {
      tripStartedAt = null;
    }, CLEAR_AFTER_RETURN_MS);
  }
};

/** True while such a picker is open, so leaving the app is only brief. */
export const isPickerOpen = (): boolean =>
  tripStartedAt !== null && Date.now() - tripStartedAt < MAX_TRIP_MS;

/** True, once, when the app is returning from such a picker. */
export const consumePickerReturn = (): boolean => {
  const startedAt = tripStartedAt;
  tripStartedAt = null;
  return startedAt !== null && Date.now() - startedAt < MAX_TRIP_MS;
};
