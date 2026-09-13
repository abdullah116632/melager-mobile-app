export interface DepositSnapshot {
  amount: number;
  depositedAt: string;
  note: string | null;
}

export interface DepositConflict {
  localId: string;
  consumerId: number;
  /** What this device tried to do. */
  localAction: "edit" | "delete";
  local: DepositSnapshot;
  /** The server's current version; null when another device deleted it. */
  server: DepositSnapshot | null;
}

type ConflictListener = () => void;

const listeners = new Set<ConflictListener>();

export const subscribeToDepositConflicts = (
  listener: ConflictListener,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitDepositConflictsChanged = (): void => {
  for (const listener of listeners) listener();
};
