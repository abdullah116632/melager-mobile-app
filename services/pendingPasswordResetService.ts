import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_PASSWORD_RESET_KEY = "@mess_pending_password_reset";

interface PendingPasswordReset {
  email: string;
  requestedAt: number;
}

export const savePendingPasswordReset = (flow: PendingPasswordReset) =>
  AsyncStorage.setItem(PENDING_PASSWORD_RESET_KEY, JSON.stringify(flow));

export const clearPendingPasswordReset = () =>
  AsyncStorage.removeItem(PENDING_PASSWORD_RESET_KEY);

export const getPendingPasswordReset = async () => {
  const stored = await AsyncStorage.getItem(PENDING_PASSWORD_RESET_KEY);
  if (!stored) return null;

  try {
    const flow = JSON.parse(stored) as Partial<PendingPasswordReset>;
    if (!flow.email || !Number.isFinite(flow.requestedAt)) {
      await clearPendingPasswordReset();
      return null;
    }
    return flow as PendingPasswordReset;
  } catch {
    await clearPendingPasswordReset();
    return null;
  }
};
