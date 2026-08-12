import type { DashboardMealType } from "@/types/dashboard";

export const DASHBOARD_MEAL_TYPES: DashboardMealType[] = [
  "breakfast",
  "lunch",
  "dinner",
];

export const DASHBOARD_MEAL_LABELS: Record<DashboardMealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export const DASHBOARD_MEAL_ICONS: Record<DashboardMealType, string> = {
  breakfast: "\u{1F305}",
  lunch: "\u2600\uFE0F",
  dinner: "\u{1F319}",
};

export const DASHBOARD_MAX_FUTURE_DAYS = 3;
