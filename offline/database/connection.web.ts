export class OfflineDatabaseUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfflineDatabaseUnavailableError";
  }
}

export const isOfflineDatabaseSupported = (): boolean => false;

export function getOfflineDatabase(): Promise<never> {
  return Promise.reject(
    new OfflineDatabaseUnavailableError(
      "The native offline database is not enabled on web.",
    ),
  );
}
