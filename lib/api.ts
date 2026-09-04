import type { DayExpenseItem } from "@/types/mess";

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
    breakfast: "day" | "ongoing" | null;
    lunch: "day" | "ongoing" | null;
    dinner: "day" | "ongoing" | null;
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

export interface MealStatusCalendarDay {
  date: string;
  meals: Array<"breakfast" | "lunch" | "dinner">;
}

export interface MealStatusCalendar {
  yearMonth: string;
  days: MealStatusCalendarDay[];
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
  ? `${API_BASE_URL.replace(/\/+$/, "")}/api`
  : DOMAIN
    ? `https://${DOMAIN}/api`
    : "/api";

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
const inFlightGets = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, { data: unknown; expiresAt: number }>();
const GET_CACHE_MS = 15_000;
const REQUEST_TIMEOUT_MS = 20_000;

export function clearApiCache(): void {
  responseCache.clear();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function req<T>(
  method: Method,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const requestKey = `${url}:${token ?? ""}`;

  if (method === "GET") {
    const cached = responseCache.get(requestKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data as T;
    if (cached) responseCache.delete(requestKey);
    const existing = inFlightGets.get(requestKey);
    if (existing) return existing as Promise<T>;
  }

  const request = (async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new ApiError(
          (data as { error?: string }).error ?? "Request failed",
          res.status,
        );
      }
      if (method === "GET") {
        responseCache.set(requestKey, {
          data,
          expiresAt: Date.now() + GET_CACHE_MS,
        });
      } else {
        // Any write may affect multiple summary/list endpoints. A small global
        // cache is cheap to clear and avoids serving inconsistent screen data.
        responseCache.clear();
      }
      return data as T;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiError(
          "Request timed out. Please check your connection and try again.",
          408,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  })();

  if (method === "GET") {
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
  role: "admin" | "member";
}

export interface ApiMyRequest {
  id: number;
  messId: number;
  messName: string;
  status: "pending" | "rejected";
}

export interface ApiConsumer {
  id: number;
  name: string;
  userId?: number | null;
  email?: string | null;
  mobileNumber?: string | null;
  isAdmin?: boolean | null;
  accountDeletedAt?: string | null;
}

export interface ApiPendingMemberRequest {
  id: number;
  userId: number;
  name: string;
  email?: string;
  status: string;
  createdAt: string;
}

export interface ApiNotice {
  id: number;
  messId: number;
  serialNo: number;
  title: string;
  body: string;
  color: string;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiBazarItem {
  id: number;
  messId: number;
  weekday: number;
  name: string;
  price: number;
  isCompleted: boolean;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiBazarAssignment {
  id: number;
  weekday: number;
  consumerId: number;
  name: string | null;
  email: string | null;
}

export interface ApiServerNotification {
  id: number;
  messId: number;
  noticeId: number | null;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ApiMessage {
  id: number;
  messId: number;
  senderUserId: number;
  senderName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiMessageCursor {
  createdAt: string;
  id: number;
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
  signup: (
    email: string,
    name: string,
    password: string,
    mobileNumber: string,
  ) =>
    req<{ message: string; pendingEmail: string }>("POST", "/auth/signup", {
      email,
      name,
      password,
      mobileNumber,
    }),

  verifyOtp: (email: string, otp: string) =>
    req<{ token: string; user: ApiUser }>("POST", "/auth/verify-otp", {
      email,
      otp,
    }),

  resendOtp: (email: string) =>
    req<{ message: string }>("POST", "/auth/resend-otp", { email }),

  forgotPassword: (email: string) =>
    req<{ message: string; pendingEmail: string }>(
      "POST",
      "/auth/forgot-password",
      { email },
    ),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    req<{ message: string }>("POST", "/auth/reset-password", {
      email,
      otp,
      newPassword,
    }),

  resendResetOtp: (email: string) =>
    req<{ message: string }>("POST", "/auth/resend-reset-otp", { email }),

  login: (email: string, password: string) =>
    req<{ token: string; user: ApiUser }>("POST", "/auth/login", {
      email,
      password,
    }),

  googleLogin: (idToken: string) =>
    req<{ token: string; user: ApiUser }>("POST", "/auth/google", { idToken }),

  me: (token: string) =>
    req<MeAuthResponse>("GET", "/auth/me", undefined, token),

  registerPushToken: (pushToken: string, platform: string, token: string) =>
    req<void>(
      "POST",
      "/devices/push-token",
      {
        token: pushToken,
        platform,
      },
      token,
    ),

  createMess: (name: string, token: string) =>
    req<{ mess: ApiMess }>("POST", "/mess/create", { name }, token),

  joinMess: (messKey: string, token: string) =>
    req<{ pendingRequest: ApiMyRequest }>(
      "POST",
      "/mess/join",
      { messKey },
      token,
    ),

  getMemberRequests: (token: string, messId: number) =>
    req<{ requests: ApiPendingMemberRequest[] }>(
      "GET",
      `/mess/member-requests?messId=${messId}`,
      undefined,
      token,
    ),

  acceptMemberRequest: (id: number, token: string) =>
    req<{ consumer: ApiConsumer }>(
      "POST",
      `/mess/member-requests/${id}/accept`,
      {},
      token,
    ),

  rejectMemberRequest: (id: number, token: string) =>
    req<{ success: boolean }>(
      "POST",
      `/mess/member-requests/${id}/reject`,
      {},
      token,
    ),

  getNotices: (token: string, messId: number) =>
    req<{ notices: ApiNotice[] }>(
      "GET",
      `/mess/notices?messId=${messId}`,
      undefined,
      token,
    ),

  createNotice: (
    title: string,
    body: string,
    color: string,
    token: string,
    messId: number,
  ) =>
    req<{ notice: ApiNotice }>(
      "POST",
      "/mess/notices",
      { title, body, color, messId },
      token,
    ),

  getUnreadNoticesCount: (token: string, messId: number) =>
    req<{ unreadCount: number }>(
      "GET",
      `/mess/notices/unread-count?messId=${messId}`,
      undefined,
      token,
    ),

  markNoticesRead: (token: string, messId: number) =>
    req<{ unreadCount: number }>(
      "POST",
      "/mess/notices/read",
      { messId },
      token,
    ),

  updateNotice: (
    id: number,
    title: string,
    body: string,
    color: string,
    token: string,
    messId: number,
  ) =>
    req<{ notice: ApiNotice }>(
      "PATCH",
      `/mess/notices/${id}`,
      { title, body, color, messId },
      token,
    ),

  deleteNotice: (id: number, token: string, messId: number) =>
    req<{ success: boolean }>(
      "DELETE",
      `/mess/notices/${id}?messId=${messId}`,
      undefined,
      token,
    ),

  reorderNotices: (noticeIds: number[], token: string, messId: number) =>
    req<{ notices: ApiNotice[] }>(
      "PATCH",
      "/mess/notices/reorder",
      { messId, noticeIds },
      token,
    ),

  getBazar: (token: string, messId: number) =>
    req<{ items: ApiBazarItem[]; assignments: ApiBazarAssignment[] }>(
      "GET",
      `/mess/bazar?messId=${messId}`,
      undefined,
      token,
    ),

  createBazarItem: (
    weekday: number,
    name: string,
    price: number,
    token: string,
    messId: number,
  ) =>
    req<{ item: ApiBazarItem }>(
      "POST",
      "/mess/bazar/items",
      { weekday, name, price, messId },
      token,
    ),

  updateBazarItem: (
    id: number,
    name: string,
    price: number,
    token: string,
    messId: number,
  ) =>
    req<{ item: ApiBazarItem }>(
      "PATCH",
      `/mess/bazar/items/${id}`,
      { name, price, messId },
      token,
    ),

  updateBazarItemStatus: (
    id: number,
    completed: boolean,
    token: string,
    messId: number,
  ) =>
    req<{ item: ApiBazarItem }>(
      "PATCH",
      `/mess/bazar/items/${id}/status`,
      { completed, messId },
      token,
    ),

  deleteBazarItem: (id: number, token: string, messId: number) =>
    req<{ success: boolean }>(
      "DELETE",
      `/mess/bazar/items/${id}?messId=${messId}`,
      undefined,
      token,
    ),

  deleteBazarItems: (weekday: number, token: string, messId: number) =>
    req<{ success: boolean; deletedCount: number }>(
      "DELETE",
      `/mess/bazar/items?messId=${messId}&weekday=${weekday}`,
      undefined,
      token,
    ),

  addBazarItemsToExpense: (
    yearMonth: string,
    day: number,
    token: string,
    messId: number,
    preview = false,
  ) =>
    req<{
      newItems: Array<{ id: string; name: string; amount: number }>;
      alreadyAddedAll: boolean;
      added: boolean;
    }>(
      "POST",
      "/mess/bazar/items/add-to-expense",
      { yearMonth, day, messId, preview },
      token,
    ),

  getMessConsumers: (token: string, messId: number) =>
    req<{ consumers: ApiConsumer[] }>(
      "GET",
      `/mess/consumers?messId=${messId}`,
      undefined,
      token,
    ),

  assignBazarMember: (
    weekday: number,
    consumerId: number,
    token: string,
    messId: number,
  ) =>
    req<{ assignment: ApiBazarAssignment }>(
      "POST",
      "/mess/bazar/assignments",
      { weekday, consumerId, messId },
      token,
    ),

  assignBazarMembers: (
    weekday: number,
    consumerIds: number[],
    token: string,
    messId: number,
  ) =>
    req<{ assignments: ApiBazarAssignment[] }>(
      "POST",
      "/mess/bazar/assignments/bulk",
      { weekday, consumerIds, messId },
      token,
    ),

  notifyAssignedBazarMembers: (weekday: number, token: string, messId: number) =>
    req<{ notifiedCount: number }>(
      "POST",
      "/mess/bazar/assignments/notify",
      { weekday, messId },
      token,
    ),

  getUnreadBazarAssignmentCount: (token: string, messId: number) =>
    req<{ unreadCount: number }>(
      "GET",
      `/mess/bazar/assignments/unread-count?messId=${messId}`,
      undefined,
      token,
    ),

  sendConsumerBreakdownNotification: (token: string, messId: number) =>
    req<{ notifiedCount: number }>(
      "POST",
      "/mess/consumer-breakdown/notify",
      { messId },
      token,
    ),

  getUnreadConsumerBreakdownCount: (token: string, messId: number) =>
    req<{ unreadCount: number }>(
      "GET",
      `/mess/consumer-breakdown/unread-count?messId=${messId}`,
      undefined,
      token,
    ),

  markConsumerBreakdownNotificationsRead: (token: string, messId: number) =>
    req<{ unreadCount: number }>(
      "POST",
      "/mess/consumer-breakdown/read",
      { messId },
      token,
    ),

  markBazarAssignmentNotificationsRead: (token: string, messId: number) =>
    req<{ unreadCount: number }>(
      "POST",
      "/mess/bazar/assignments/read",
      { messId },
      token,
    ),

  unassignBazarMember: (id: number, token: string, messId: number) =>
    req<{ success: boolean }>(
      "DELETE",
      `/mess/bazar/assignments/${id}?messId=${messId}`,
      undefined,
      token,
    ),

  getNotifications: (token: string, messId: number) =>
    req<{ notifications: ApiServerNotification[] }>(
      "GET",
      `/mess/notifications?messId=${messId}`,
      undefined,
      token,
    ),

  getMessages: (
    token: string,
    messId: number,
    options?: { limit?: number; beforeCreatedAt?: string; beforeId?: number },
  ) => {
    const params = new URLSearchParams({ messId: String(messId) });
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.beforeCreatedAt)
      params.set("beforeCreatedAt", options.beforeCreatedAt);
    if (options?.beforeId) params.set("beforeId", String(options.beforeId));
    return req<{ messages: ApiMessage[]; nextCursor: ApiMessageCursor | null }>(
      "GET",
      `/mess/messages?${params.toString()}`,
      undefined,
      token,
    );
  },

  sendMessage: (body: string, token: string, messId: number) =>
    req<{ message: ApiMessage }>(
      "POST",
      "/mess/messages",
      { body, messId },
      token,
    ),

  getUnreadMessageCount: (token: string, messId: number) =>
    req<{ unreadCount: number }>(
      "GET",
      `/mess/messages/unread-count?messId=${messId}`,
      undefined,
      token,
    ),

  markMessagesRead: (token: string, messId: number) =>
    req<{ unreadCount: number }>(
      "POST",
      "/mess/messages/read",
      { messId },
      token,
    ),

  markServerNotificationRead: (id: number, token: string) =>
    req<{ success: boolean }>(
      "POST",
      `/mess/notifications/${id}/read`,
      {},
      token,
    ),

  getMonthData: (yearMonth: string, token: string, messId: number) =>
    req<MonthData>(
      "GET",
      `/mess/data/${yearMonth}?messId=${messId}`,
      undefined,
      token,
    ),

  getConsumers: (token: string, messId: number) =>
    req<{ consumers: ApiConsumer[] }>(
      "GET",
      `/mess/consumers?messId=${messId}`,
      undefined,
      token,
    ),

  lookupConsumerUser: (email: string, token: string, messId: number) =>
    req<{ exists: boolean; name?: string }>(
      "GET",
      `/mess/consumer-user?messId=${messId}&email=${encodeURIComponent(email)}`,
      undefined,
      token,
    ),

  deleteConsumer: (consumerId: number, token: string, messId: number) =>
    req<{ success: boolean }>(
      "DELETE",
      `/mess/consumers/${consumerId}?messId=${messId}`,
      undefined,
      token,
    ),

  addConsumer: (
    name: string,
    email: string,
    mobileNumber: string | undefined,
    token: string,
    messId: number,
  ) =>
    req<{ consumer?: ApiConsumer; invitationSent: boolean }>(
      "POST",
      "/mess/consumers",
      { name, email, mobileNumber, messId },
      token,
    ),

  removeConsumer: (id: number, token: string, messId: number) =>
    req<{ success: boolean }>(
      "DELETE",
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
      "PUT",
      "/mess/meals",
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
      "PUT",
      "/mess/expenses",
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
      "PUT",
      "/mess/deposits",
      { consumerId, yearMonth, day, amount, messId },
      token,
    ),

  updateProfile: (name: string, token: string) =>
    req<{ name: string }>("PATCH", "/settings/profile", { name }, token),

  updatePhone: (phone: string | null, token: string) =>
    req<{ mobileNumber: string | null }>(
      "PATCH",
      "/settings/profile/phone",
      { phone },
      token,
    ),

  deleteAccount: (password: string, token: string) =>
    req<{ success: boolean }>(
      "DELETE",
      "/settings/account",
      { password },
      token,
    ),

  requestAccountDeletionOtp: (email: string) =>
    req<{ message: string }>("POST", "/auth/account-deletion/request-otp", {
      email,
    }),

  confirmAccountDeletionOtp: (email: string, otp: string) =>
    req<{ success: boolean }>("POST", "/auth/account-deletion/confirm", {
      email,
      otp,
    }),

  updateMessName: (name: string, token: string, messId: number) =>
    req<{ name: string }>("PATCH", "/settings/mess", { name, messId }, token),

  getEligibleAdmins: (token: string, messId: number) =>
    req<{ consumers: ApiConsumer[] }>(
      "GET",
      `/settings/security/eligible-admins?messId=${messId}`,
      undefined,
      token,
    ),

  inviteByEmail: (messId: number, toEmail: string, token: string) =>
    req<{ success: boolean }>(
      "POST",
      "/mess/invite",
      { messId, toEmail },
      token,
    ),

  sendMonthlySummary: (messId: number, yearMonth: string, token: string) =>
    req<{ sent: number; total: number }>(
      "POST",
      "/mess/send-summary",
      { messId, yearMonth },
      token,
    ),

  sendBlendedSummary: (messId: number, yearMonths: string[], token: string) =>
    req<{ sent: number; total: number }>(
      "POST",
      "/mess/send-blended-summary",
      { messId, yearMonths },
      token,
    ),

  retryJoin: (requestId: number, token: string) =>
    req<{ request: ApiMyRequest }>(
      "POST",
      "/mess/rejoin",
      { requestId },
      token,
    ),

  requestSecurityOtp: (
    action: string,
    token: string,
    opts?: { currentPassword?: string; payload?: string; messId?: number },
  ) =>
    req<{ message: string }>(
      "POST",
      "/settings/security/request-otp",
      {
        action,
        currentPassword: opts?.currentPassword,
        payload: opts?.payload,
        messId: opts?.messId,
      },
      token,
    ),

  getTodaySchedule: (messId: number, token: string, date?: string) =>
    req<TodaySchedule>(
      "GET",
      `/mess/today-schedule?messId=${messId}${date ? `&date=${date}` : ""}`,
      undefined,
      token,
    ),

  getMealStatusDayV2: (messId: number, token: string, date: string) =>
    req<TodaySchedule>(
      "GET",
      `/v2/mess/meal-status/day?messId=${messId}&date=${date}`,
      undefined,
      token,
    ),

  getMealStatusCalendarV2: (messId: number, token: string, yearMonth: string) =>
    req<MealStatusCalendar>(
      "GET",
      `/v2/mess/meal-status/calendar?messId=${messId}&yearMonth=${yearMonth}`,
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
        mealType: "breakfast" | "lunch" | "dinner";
        enabled: boolean;
        scope: "day" | "ongoing";
      }>;
    },
    token: string,
  ) => req<{ success: boolean }>("PUT", "/mess/meal-schedule", data, token),

  toggleMealOptOut: (
    messId: number,
    date: string,
    mealType: string,
    scope: "day" | "ongoing",
    token: string,
  ) =>
    req<{
      isOptedOut: boolean;
      scope: "day" | "ongoing" | null;
    }>("POST", "/mess/meal-opt-out", { messId, date, mealType, scope }, token),

  toggleMealOptOutV2: (
    messId: number,
    date: string,
    mealType: string,
    scope: "day" | "ongoing",
    token: string,
  ) =>
    req<{
      isOptedOut: boolean;
      scope: "day" | "ongoing" | null;
    }>(
      "POST",
      "/v2/mess/meal-status/opt-out",
      { messId, date, mealType, scope },
      token,
    ),

  getMealOptOuts: (messId: number, date: string | undefined, token: string) =>
    req<{ date: string; consumers: ConsumerMealStatus[] }>(
      "GET",
      `/mess/meal-opt-outs?messId=${messId}${date ? `&date=${date}` : ""}`,
      undefined,
      token,
    ),

  addDepositEntry: (
    data: {
      messId: number;
      consumerId: number;
      amount: number;
      depositedAt?: string;
      note?: string;
    },
    token: string,
  ) => req<{ entry: DepositEntry }>("POST", "/mess/deposit-entry", data, token),

  updateDepositEntry: (
    id: number,
    data: {
      messId: number;
      amount: number;
      depositedAt: string;
      note?: string;
    },
    token: string,
  ) =>
    req<{ entry: DepositEntry }>(
      "PATCH",
      `/mess/deposit-entry/${id}`,
      data,
      token,
    ),

  getDepositEntries: (messId: number, yearMonth: string, token: string) =>
    req<{ entries: DepositEntry[] }>(
      "GET",
      `/mess/deposit-entries?messId=${messId}&yearMonth=${yearMonth}`,
      undefined,
      token,
    ),

  deleteDepositEntry: (id: number, messId: number, token: string) =>
    req<{ success: boolean }>(
      "DELETE",
      `/mess/deposit-entry/${id}?messId=${messId}`,
      undefined,
      token,
    ),
};
