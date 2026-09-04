import { api } from "@/lib/api";
import type { MealScheduleUpdate } from "@/types/mealStatus";
import type { SQLiteDatabase } from "expo-sqlite";
import { MealScheduleRepository } from "@/offline/features/meals/MealScheduleRepository";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";

export const getMealStatus = async (
  messId: number,
  date: string,
  token: string,
) => {
  const [schedule, optOuts] = await Promise.all([
    api.getTodaySchedule(messId, token, date),
    api.getMealOptOuts(messId, date, token),
  ]);

  return { schedule: schedule.schedule, myOptOuts: schedule.myOptOuts, consumers: optOuts.consumers };
};

export const getLocalMealStatus = async (
  database: SQLiteDatabase | null,
  userId: number | null,
  messId: number,
  date: string,
) => {
  if (!database || !userId) return null;
  return new MealScheduleRepository(database).getSnapshot(userId, messId, date);
};

export const cacheMealStatus = async (
  database: SQLiteDatabase | null,
  userId: number | null,
  messId: number,
  date: string,
  schedule: Awaited<ReturnType<typeof getMealStatus>>["schedule"],
  consumers: Awaited<ReturnType<typeof getMealStatus>>["consumers"],
  myOptOuts: string[] = [],
) => {
  if (!database || !userId) return;
  await new MealScheduleRepository(database).replaceRemoteSnapshot(
    userId,
    messId,
    date,
    { date, schedule, myOptOuts, totalConsumers: consumers.length, activeByMeal: { breakfast: 0, lunch: 0, dinner: 0 }, totalActive: 0 },
    consumers,
  );
};

export const updateMealSchedule = (data: MealScheduleUpdate, token: string) =>
  api.setMealSchedule(data, token);

export const queueMealScheduleUpdate = async (
  database: SQLiteDatabase | null,
  userId: number | null,
  data: MealScheduleUpdate,
  schedule: Awaited<ReturnType<typeof getMealStatus>>["schedule"],
) => {
  if (!database || !userId) return false;
  const repository = new MealScheduleRepository(database);
  await repository.saveSchedule(userId, data.messId, data.date, schedule, { date: data.date, schedule });
  return true;
};

export const syncMealScheduleNow = async (database: SQLiteDatabase | null, token: string, userId: number, messId: number) => {
  if (!database) return;
  await getOfflineRuntime(database).engine.sync({ userId, messId, token }, { collections: ["meal_schedule"], force: true });
};
