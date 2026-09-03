import { api, ApiError } from "@/lib/api";
import { getDashboardMonthRange } from "@/utils/dashboard";

const isMissingV2Route = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 404;

export const getDashboardSchedule = (
  messId: number,
  token: string,
  date: string,
) =>
  api.getMealStatusDayV2(messId, token, date).catch((error: unknown) => {
    if (isMissingV2Route(error)) {
      return api.getTodaySchedule(messId, token, date);
    }
    throw error;
  });

export const getDashboardMealCalendar = (
  messId: number,
  token: string,
  yearMonth: string,
) =>
  api
    .getMealStatusCalendarV2(messId, token, yearMonth)
    .catch((error: unknown) => {
      if (isMissingV2Route(error)) return { yearMonth, days: [] };
      throw error;
    });

export const toggleDashboardMeal = (
  messId: number,
  date: string,
  mealType: string,
  scope: "day" | "ongoing",
  token: string,
) =>
  api
    .toggleMealOptOutV2(messId, date, mealType, scope, token)
    .catch((error: unknown) => {
      if (isMissingV2Route(error)) {
        return api.toggleMealOptOut(messId, date, mealType, scope, token);
      }
      throw error;
    });

export const getDashboardRangeData = async (
  messId: number,
  token: string,
  startDate: string,
  endDate: string,
) => {
  const months = getDashboardMonthRange(startDate, endDate);
  const results = await Promise.all(
    months.map(
      async (yearMonth) =>
        [yearMonth, await api.getMonthData(yearMonth, token, messId)] as const,
    ),
  );
  return Object.fromEntries(results);
};

export const sendDashboardMonthlySummary = (
  messId: number,
  yearMonth: string,
  token: string,
) => api.sendMonthlySummary(messId, yearMonth, token);
