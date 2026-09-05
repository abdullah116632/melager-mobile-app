type ConflictListener = () => void;

const listeners = new Set<ConflictListener>();

export const subscribeToDailyMealConflicts = (
  listener: ConflictListener,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitDailyMealConflictsChanged = (): void => {
  for (const listener of listeners) listener();
};
