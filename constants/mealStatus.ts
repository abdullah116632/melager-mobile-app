import type { MealDraft, MealType } from "@/types/mealStatus";

export const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
};

export const DEFAULT_MEAL_DRAFT: MealDraft = {
  breakfast: { enabled: true, menu: "", start: "", end: "" },
  lunch: { enabled: true, menu: "", start: "", end: "" },
  dinner: { enabled: true, menu: "", start: "", end: "" },
};

export const MEAL_STATUS_MAX_FUTURE_DAYS = 3;
export const MEAL_STATUS_AUTOSAVE_DELAY = 500;
export const MEAL_TABLE_NAME_WIDTH = 140;
export const MEAL_TABLE_COLUMN_WIDTH = 54;
