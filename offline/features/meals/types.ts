import type { ConsumerMealStatus, TodaySchedule } from "@/lib/api";

export interface MealScheduleSnapshot {
  schedule: TodaySchedule;
  consumers: ConsumerMealStatus[];
  pendingCount: number;
  savedAt: number;
}

export interface MealScheduleMutation {
  date: string;
  schedule?: TodaySchedule["schedule"];
  mealType?: "breakfast" | "lunch" | "dinner";
  scope?: "day" | "ongoing";
  isOptedOut?: boolean;
}
