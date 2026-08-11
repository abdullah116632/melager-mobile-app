import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PendingAdminOtpFlow } from "@/types/security";

const PENDING_ADMIN_OTP_KEY = "@mess_pending_admin_otp";

export const savePendingAdminOtp = (flow: PendingAdminOtpFlow) =>
  AsyncStorage.setItem(PENDING_ADMIN_OTP_KEY, JSON.stringify(flow));

export const clearPendingAdminOtp = () =>
  AsyncStorage.removeItem(PENDING_ADMIN_OTP_KEY);

export const getPendingAdminOtp = async () => {
  const stored = await AsyncStorage.getItem(PENDING_ADMIN_OTP_KEY);
  if (!stored) return null;

  try {
    const flow = JSON.parse(stored) as Partial<PendingAdminOtpFlow>;
    if (
      !flow.action ||
      ![
        "change_password",
        "update_email",
        "add_admin",
        "add_co_admin",
        "remove_self_admin",
      ].includes(flow.action) ||
      !Number.isInteger(flow.userId) ||
      !Number.isInteger(flow.messId)
    ) {
      await clearPendingAdminOtp();
      return null;
    }
    return flow as PendingAdminOtpFlow;
  } catch {
    await clearPendingAdminOtp();
    return null;
  }
};
