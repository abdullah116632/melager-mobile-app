import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_SIGNUP_OTP_KEY = "@melager_pending_signup_otp";

interface PendingSignupOtp {
  email: string;
  requestedAt: number;
}

export const savePendingSignupOtp = (flow: PendingSignupOtp) =>
  AsyncStorage.setItem(PENDING_SIGNUP_OTP_KEY, JSON.stringify(flow));

export const clearPendingSignupOtp = () =>
  AsyncStorage.removeItem(PENDING_SIGNUP_OTP_KEY);

export const getPendingSignupOtp = async () => {
  const stored = await AsyncStorage.getItem(PENDING_SIGNUP_OTP_KEY);
  if (!stored) return null;

  try {
    const flow = JSON.parse(stored) as Partial<PendingSignupOtp>;
    if (!flow.email || !Number.isFinite(flow.requestedAt)) {
      await clearPendingSignupOtp();
      return null;
    }
    return flow as PendingSignupOtp;
  } catch {
    await clearPendingSignupOtp();
    return null;
  }
};
