export type AuthMode =
  "login" | "signup" | "otp" | "forgot" | "reset-otp" | "reset";

export interface AuthCredentialsDraft {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
}

export interface ResetPasswordDraft {
  newPassword: string;
  confirmPassword: string;
  showPassword: boolean;
}
