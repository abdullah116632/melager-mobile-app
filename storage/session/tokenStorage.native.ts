import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  LEGACY_TOKEN_KEY,
  SECURE_TOKEN_KEY,
  SECURE_TOKEN_SERVICE,
} from "./constants";

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainService: SECURE_TOKEN_SERVICE,
  // Background sync can read the token after the first device unlock, while
  // preventing it from being restored onto a different device.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export async function getSessionToken(): Promise<string | null> {
  const secureToken = await SecureStore.getItemAsync(
    SECURE_TOKEN_KEY,
    secureStoreOptions,
  );
  if (secureToken) return secureToken;

  // One-time migration for users who signed in before SecureStore was added.
  const legacyToken = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
  if (!legacyToken) return null;

  await SecureStore.setItemAsync(
    SECURE_TOKEN_KEY,
    legacyToken,
    secureStoreOptions,
  );
  await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
  return legacyToken;
}

export async function setSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token, secureStoreOptions);
  await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
}

export async function deleteSessionToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_TOKEN_KEY, secureStoreOptions),
    AsyncStorage.removeItem(LEGACY_TOKEN_KEY),
  ]);
}
