export type MealType = "breakfast" | "lunch" | "dinner";

export type ControlScope = "day" | "ongoing";

export interface MealDraftItem {
  enabled: boolean;
  menu: string;
  start: string;
  end: string;
}

export type MealDraft = Record<MealType, MealDraftItem>;

export type PendingMealControls = Partial<
  Record<MealType, { enabled: boolean; scope: ControlScope }>
>;

export interface MealStatusConsumer {
  consumerId: number;
  consumerName: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export interface MealScheduleUpdate {
  messId: number;
  date: string;
  breakfastEnabled: boolean;
  breakfastMenu: string | null;
  breakfastOptOutStart: string | null;
  breakfastOptOutEnd: string | null;
  lunchEnabled: boolean;
  lunchMenu: string | null;
  lunchOptOutStart: string | null;
  lunchOptOutEnd: string | null;
  dinnerEnabled: boolean;
  dinnerMenu: string | null;
  dinnerOptOutStart: string | null;
  dinnerOptOutEnd: string | null;
  mealControls: Array<{
    mealType: MealType;
    enabled: boolean;
    scope: ControlScope;
  }>;
}
