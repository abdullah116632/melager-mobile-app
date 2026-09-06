import { api } from "@/lib/api";
import { getDashboardMonthRange } from "@/utils/dashboard";

export const getDashboardSchedule = (
  messId: number,
  token: string,
  date: string,
) => api.getMealStatusDayV2(messId, token, date);

export const getDashboardMealCalendar = (
  messId: number,
  token: string,
  yearMonth: string,
) =>
  api.getMealStatusCalendarV2(messId, token, yearMonth);

export const toggleDashboardMeal = (
  messId: number,
  date: string,
  mealType: string,
  scope: "day" | "ongoing",
  token: string,
  isOptedOut: boolean,
) =>
  api.toggleMealOptOutV2(messId, date, mealType, scope, token, isOptedOut);

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
