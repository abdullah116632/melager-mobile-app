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
export const DASHBOARD_TABLE_WIDTHS = {
  name: 110,
  meals: 52,
  cost: 82,
  deposit: 82,
  balance: 90,
  rowPadding: 10,
} as const;

export const DASHBOARD_TABLE_INNER_WIDTH =
  DASHBOARD_TABLE_WIDTHS.name +
  DASHBOARD_TABLE_WIDTHS.meals +
  DASHBOARD_TABLE_WIDTHS.cost +
  DASHBOARD_TABLE_WIDTHS.deposit +
  DASHBOARD_TABLE_WIDTHS.balance +
  DASHBOARD_TABLE_WIDTHS.rowPadding * 2;
