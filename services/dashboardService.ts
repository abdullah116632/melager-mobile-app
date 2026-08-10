import { api } from "@/lib/api";
import { getDashboardMonthRange } from "@/utils/dashboard";

export const getDashboardSchedule = (
  messId: number,
  token: string,
  date: string,
) => api.getTodaySchedule(messId, token, date);

export const toggleDashboardMeal = (
  messId: number,
  date: string,
  mealType: string,
  token: string,
) => api.toggleMealOptOut(messId, date, mealType, token);

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
