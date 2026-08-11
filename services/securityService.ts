import type { EligibleAdmin, SecurityAction } from "@/types/security";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const BASE_URL = API_BASE_URL
  ? `${API_BASE_URL.replace(/\/+$/, "")}/api`
  : DOMAIN
    ? `https://${DOMAIN}/api`
    : "/api";

type Method = "GET" | "POST";

const securityRequest = async <T>(
  method: Method,
  path: string,
  token: string | null,
  body?: object,
): Promise<T> => {
  if (!token) throw new Error("Authentication is required.");

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const responseText = await response.text();
  let data: { error?: string } & T;

  try {
    data = responseText
      ? (JSON.parse(responseText) as { error?: string } & T)
      : ({} as { error?: string } & T);
  } catch {
    throw new Error(
      `The server returned an invalid response (HTTP ${response.status}). Please check the API connection.`,
    );
  }

  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
};

export const getEligibleAdmins = (token: string | null, messId: number) =>
  securityRequest<{ consumers: EligibleAdmin[] }>(
    "GET",
    `/settings/security/eligible-admins?messId=${messId}`,
    token,
  );

export const requestSecurityOtp = (
  token: string | null,
  data: {
    action: SecurityAction;
    currentPassword?: string;
    newPassword?: string;
    payload?: string;
    messId?: number;
  },
) =>
  securityRequest<{ message: string }>(
    "POST",
    "/settings/security/request-otp",
    token,
    data,
  );

export const resendSecurityOtp = (
  token: string | null,
  action: SecurityAction,
) =>
  securityRequest<{ message: string }>(
    "POST",
    "/settings/security/resend-otp",
    token,
    { action },
  );

export const changeSecurityPassword = (token: string | null, otp: string) =>
  securityRequest<{ message: string }>(
    "POST",
    "/settings/security/change-password",
    token,
    { otp },
  );

export const updateSecurityEmail = (token: string | null, otp: string) =>
  securityRequest<{ message: string; newEmail: string }>(
    "POST",
    "/settings/security/update-email",
    token,
    { otp },
  );

export const confirmAdminTransfer = (token: string | null, otp: string) =>
  securityRequest<{ message: string }>(
    "POST",
    "/settings/security/add-admin",
    token,
    { otp },
  );

export const confirmCoAdmin = (token: string | null, otp: string) =>
  securityRequest<{ message: string }>(
    "POST",
    "/settings/security/add-co-admin",
    token,
    { otp },
  );

export const confirmSelfAdminRemoval = (token: string | null, otp: string) =>
  securityRequest<{ message: string }>(
    "POST",
    "/settings/security/remove-self-admin",
    token,
    { otp },
  );
