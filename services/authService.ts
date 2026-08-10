import { api } from "@/lib/api";

export const requestPasswordReset = (email: string) =>
  api.forgotPassword(email);

export const resendPasswordResetCode = (email: string) =>
  api.resendResetOtp(email);

export const submitPasswordReset = (
  email: string,
  otp: string,
  newPassword: string,
) => api.resetPassword(email, otp, newPassword);
