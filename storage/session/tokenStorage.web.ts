import AsyncStorage from "@react-native-async-storage/async-storage";

import { LEGACY_TOKEN_KEY } from "./constants";

// SecureStore is unavailable on web. Keep this adapter isolated so native
// bundles never fall back to unencrypted AsyncStorage for authentication.
export const getSessionToken = (): Promise<string | null> =>
  AsyncStorage.getItem(LEGACY_TOKEN_KEY);

export const setSessionToken = (token: string): Promise<void> =>
  AsyncStorage.setItem(LEGACY_TOKEN_KEY, token);

export const deleteSessionToken = (): Promise<void> =>
  AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
