import { api } from "@/lib/api";
import type { MealScheduleUpdate } from "@/types/mealStatus";

export const getMealStatus = async (
  messId: number,
  date: string,
  token: string,
) => {
  const [schedule, optOuts] = await Promise.all([
    api.getTodaySchedule(messId, token, date),
    api.getMealOptOuts(messId, date, token),
  ]);

  return { schedule: schedule.schedule, consumers: optOuts.consumers };
};

export const updateMealSchedule = (data: MealScheduleUpdate, token: string) =>
  api.setMealSchedule(data, token);
