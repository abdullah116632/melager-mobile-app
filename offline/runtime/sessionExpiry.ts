type Listener = () => void;

const listeners = new Set<Listener>();

/** Sync stopped because the server no longer accepts the saved token. */
export const subscribeToSessionExpired = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitSessionExpired = (): void => {
  for (const listener of listeners) listener();
};
