import { DayExpenseItem } from '@/context/MessContext';

export interface MealSchedule {
  breakfastEnabled: boolean;
  breakfastMenu: string | null;
  breakfastOptOutStart: string | null;
  breakfastOptOutEnd: string | null;
  lunchEnabled: boolean;
  lunchMenu: string | null;
  lunchOptOutStart: string | null;
  lunchOptOutEnd: string | null;
  dinnerEnabled: boolean;
  dinnerMenu: string | null;
  dinnerOptOutStart: string | null;
  dinnerOptOutEnd: string | null;
  availabilitySource?: {
    breakfast: 'day' | 'ongoing' | null;
    lunch: 'day' | 'ongoing' | null;
    dinner: 'day' | 'ongoing' | null;
  };
}

export interface TodaySchedule {
  date: string;
  schedule: MealSchedule;
  myOptOuts: string[];
  totalConsumers: number;
  activeByMeal: { breakfast: number; lunch: number; dinner: number };
  totalActive: number;
}

export interface ConsumerMealStatus {
  consumerId: number;
  consumerName: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface DepositEntry {
  id: number;
  consumerId: number;
  amount: number;
  depositedAt: string;
  note?: string | null;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const BASE_URL = API_BASE_URL
  ? `${API_BASE_URL.replace(/\/+$/, '')}/api`
  : DOMAIN
    ? `https://${DOMAIN}/api`
    : '/api';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
const inFlightGets = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, { data: unknown; expiresAt: number }>();
const GET_CACHE_MS = 15_000;

export function clearApiCache(): void {
  responseCache.clear();
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function req<T>(method: Method, path: string, body?: unknown, token?: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const requestKey = `${url}:${token ?? ''}`;

  if (method === 'GET') {
    const cached = responseCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data as T;
    if (cached) responseCache.delete(requestKey);
    const existing = inFlightGets.get(requestKey);
    if (existing) return existing as Promise<T>;
  }

  const request = (async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new ApiError((data as { error?: string }).error ?? 'Request failed', res.status);
    }
    if (method === 'GET') {
      responseCache.set(requestKey, { data, expiresAt: Date.now() + GET_CACHE_MS });
    } else {
      // Any write may affect multiple summary/list endpoints. A small global
      // cache is cheap to clear and avoids serving inconsistent screen data.
      responseCache.clear();
    }
    return data as T;
  })();

  if (method === 'GET') {
    inFlightGets.set(requestKey, request);
    void request.then(
      () => inFlightGets.delete(requestKey),
      () => inFlightGets.delete(requestKey),
    );
  }

  return request;
}

export interface ApiUser {
  id: number;
  email: string;
  name: string;
  mobileNumber?: string | null;
}

export interface ApiMess {
  id: number;
  name: string;
  messKey: string;
}

export interface ApiMessWithRole extends ApiMess {
  role: 'admin' | 'member';
}

export interface ApiMyRequest {
  id: number;
  messId: number;
  messName: string;
  status: 'pending' | 'rejected';
}

export interface ApiConsumer {
  id: number;
  name: string;
  userId?: number | null;
  email?: string | null;
  mobileNumber?: string | null;
  isAdmin?: boolean | null;
}

export interface ApiPendingMemberRequest {
  id: number;
  userId: number;
  name: string;
  email?: string;
  status: string;
  createdAt: string;
}

export interface MeAuthResponse {
  user: ApiUser;
  messes: ApiMessWithRole[];
  requests: ApiMyRequest[];
}

export interface MonthData {
  consumers: ApiConsumer[];
  meals: Record<string, Record<string, number>>;
  expenses: Record<string, { items: DayExpenseItem[] }>;
  deposits: Record<string, Record<string, number>>;
}

export const api = {
  signup: (email: string, name: string, password: string, mobileNumber: string) =>
    req<{ message: string; pendingEmail: string }>('POST', '/auth/signup', { email, name, password, mobileNumber }),

  verifyOtp: (email: string, otp: string) =>
    req<{ token: string; user: ApiUser }>('POST', '/auth/verify-otp', { email, otp }),

  resendOtp: (email: string) =>
    req<{ message: string }>('POST', '/auth/resend-otp', { email }),

  forgotPassword: (email: string) =>
    req<{ message: string; pendingEmail: string }>('POST', '/auth/forgot-password', { email }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    req<{ message: string }>('POST', '/auth/reset-password', { email, otp, newPassword }),

  resendResetOtp: (email: string) =>
    req<{ message: string }>('POST', '/auth/resend-reset-otp', { email }),

  login: (email: string, password: string) =>
    req<{ token: string; user: ApiUser }>('POST', '/auth/login', { email, password }),

  googleLogin: (idToken: string) =>
    req<{ token: string; user: ApiUser }>('POST', '/auth/google', { idToken }),

  me: (token: string) => req<MeAuthResponse>('GET', '/auth/me', undefined, token),

  createMess: (name: string, token: string) =>
    req<{ mess: ApiMess }>('POST', '/mess/create', { name }, token),

  joinMess: (messKey: string, token: string) =>
    req<{ pendingRequest: ApiMyRequest }>('POST', '/mess/join', { messKey }, token),

  getMemberRequests: (token: string, messId: number) =>
    req<{ requests: ApiPendingMemberRequest[] }>(
      'GET',
      `/mess/member-requests?messId=${messId}`,
      undefined,
      token,
    ),

  acceptMemberRequest: (id: number, token: string) =>
    req<{ consumer: ApiConsumer }>('POST', `/mess/member-requests/${id}/accept`, {}, token),

  rejectMemberRequest: (id: number, token: string) =>
    req<{ success: boolean }>('POST', `/mess/member-requests/${id}/reject`, {}, token),

  getMonthData: (yearMonth: string, token: string, messId: number) =>
    req<MonthData>('GET', `/mess/data/${yearMonth}?messId=${messId}`, undefined, token),

  getConsumers: (token: string, messId: number) =>
    req<{ consumers: ApiConsumer[] }>('GET', `/mess/consumers?messId=${messId}`, undefined, token),

  deleteConsumer: (consumerId: number, token: string, messId: number) =>
    req<{ success: boolean }>('DELETE', `/mess/consumers/${consumerId}?messId=${messId}`, undefined, token),

  addConsumer: (
    name: string,
    email: string,
    mobileNumber: string | undefined,
    token: string,
    messId: number,
  ) =>
    req<{ consumer: ApiConsumer }>(
      'POST',
      '/mess/consumers',
      { name, email, mobileNumber, messId },
      token,
    ),

  removeConsumer: (id: number, token: string, messId: number) =>
    req<{ success: boolean }>(
      'DELETE',
      `/mess/consumers/${id}?messId=${messId}`,
      undefined,
      token,
    ),

  setMeal: (
    consumerId: string,
    yearMonth: string,
    day: number,
    count: number,
    token: string,
    messId: number,
  ) =>
    req<{ success: boolean }>(
      'PUT',
      '/mess/meals',
      { consumerId, yearMonth, day, count, messId },
      token,
    ),

  setExpense: (
    yearMonth: string,
    day: number,
    items: DayExpenseItem[],
    token: string,
    messId: number,
  ) =>
    req<{ success: boolean }>(
      'PUT',
      '/mess/expenses',
      { yearMonth, day, items, messId },
      token,
    ),

  setDeposit: (
    consumerId: string,
    yearMonth: string,
    day: number,
    amount: number,
    token: string,
    messId: number,
  ) =>
    req<{ success: boolean }>(
      'PUT',
      '/mess/deposits',
      { consumerId, yearMonth, day, amount, messId },
      token,
    ),

  updateProfile: (name: string, token: string) =>
    req<{ name: string }>('PATCH', '/settings/profile', { name }, token),

  updatePhone: (phone: string | null, token: string) =>
    req<{ mobileNumber: string | null }>('PATCH', '/settings/profile/phone', { phone }, token),

  updateMessName: (name: string, token: string, messId: number) =>
    req<{ name: string }>('PATCH', '/settings/mess', { name, messId }, token),

  getEligibleAdmins: (token: string, messId: number) =>
    req<{ consumers: ApiConsumer[] }>(
      'GET',
      `/settings/security/eligible-admins?messId=${messId}`,
      undefined,
      token,
    ),

  inviteByEmail: (messId: number, toEmail: string, token: string) =>
    req<{ success: boolean }>('POST', '/mess/invite', { messId, toEmail }, token),

  sendMonthlySummary: (messId: number, yearMonth: string, token: string) =>
    req<{ sent: number; total: number }>('POST', '/mess/send-summary', { messId, yearMonth }, token),

  sendBlendedSummary: (messId: number, yearMonths: string[], token: string) =>
    req<{ sent: number; total: number }>('POST', '/mess/send-blended-summary', { messId, yearMonths }, token),

  retryJoin: (requestId: number, token: string) =>
    req<{ request: ApiMyRequest }>('POST', '/mess/rejoin', { requestId }, token),

  requestSecurityOtp: (
    action: string,
    token: string,
    opts?: { currentPassword?: string; payload?: string; messId?: number },
  ) =>
    req<{ message: string }>(
      'POST',
      '/settings/security/request-otp',
      { action, currentPassword: opts?.currentPassword, payload: opts?.payload, messId: opts?.messId },
      token,
    ),

  getTodaySchedule: (messId: number, token: string, date?: string) =>
    req<TodaySchedule>(
      'GET',
      `/mess/today-schedule?messId=${messId}${date ? `&date=${date}` : ''}`,
      undefined,
      token,
    ),

  setMealSchedule: (
    data: {
      messId: number;
      date: string;
      breakfastEnabled: boolean;
      breakfastMenu: string | null;
      breakfastOptOutStart: string | null;
      breakfastOptOutEnd: string | null;
      lunchEnabled: boolean;
      lunchMenu: string | null;
      lunchOptOutStart: string | null;
      lunchOptOutEnd: string | null;
      dinnerEnabled: boolean;
      dinnerMenu: string | null;
      dinnerOptOutStart: string | null;
      dinnerOptOutEnd: string | null;
      mealControls?: Array<{
        mealType: 'breakfast' | 'lunch' | 'dinner';
        enabled: boolean;
        scope: 'day' | 'ongoing';
      }>;
    },
    token: string,
  ) => req<{ success: boolean }>('PUT', '/mess/meal-schedule', data, token),

  toggleMealOptOut: (messId: number, date: string, mealType: string, token: string) =>
    req<{ isOptedOut: boolean }>('POST', '/mess/meal-opt-out', { messId, date, mealType }, token),

  getMealOptOuts: (messId: number, date: string | undefined, token: string) =>
    req<{ date: string; consumers: ConsumerMealStatus[] }>(
      'GET',
      `/mess/meal-opt-outs?messId=${messId}${date ? `&date=${date}` : ''}`,
      undefined,
      token,
    ),

  addDepositEntry: (
    data: { messId: number; consumerId: number; amount: number; depositedAt?: string; note?: string },
    token: string,
  ) => req<{ entry: DepositEntry }>('POST', '/mess/deposit-entry', data, token),

  getDepositEntries: (messId: number, yearMonth: string, token: string) =>
    req<{ entries: DepositEntry[] }>(
      'GET',
      `/mess/deposit-entries?messId=${messId}&yearMonth=${yearMonth}`,
      undefined,
      token,
    ),

  deleteDepositEntry: (id: number, messId: number, token: string) =>
    req<{ success: boolean }>('DELETE', `/mess/deposit-entry/${id}?messId=${messId}`, undefined, token),
};
