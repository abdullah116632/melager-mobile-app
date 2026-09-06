import type { ConsumerMealStatus, TodaySchedule } from "@/lib/api";
import type { MealScheduleUpdate } from "@/types/mealStatus";

export interface MealScheduleSnapshot {
  schedule: TodaySchedule;
  consumers: ConsumerMealStatus[];
  pendingCount: number;
  savedAt: number;
}

export interface MealScheduleMutation {
  date: string;
  // Keep the original partial v2 request. Replaying a reconstructed full
  // schedule would turn a menu-only edit into a helper/window update.
  schedule?: Omit<MealScheduleUpdate, "messId" | "date">;
  mealType?: "breakfast" | "lunch" | "dinner";
  scope?: "day" | "ongoing";
  isOptedOut?: boolean;
}
