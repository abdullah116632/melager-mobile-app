export type { MonthData, TodaySchedule } from "@/lib/api";

export type DashboardMealType = "breakfast" | "lunch" | "dinner";
export type DashboardDatePickerTarget = "start" | "end";

export interface DashboardDateRange {
  startDate: string;
  endDate: string;
}

export interface DashboardConsumer {
  id: string;
  name: string;
  userId?: number | null;
  email?: string | null;
  mobileNumber?: string | null;
  isAdmin?: boolean | null;
  accountDeletedAt?: string | null;
}

export interface DashboardConsumerRow extends DashboardConsumer {
  meals: number;
  cost: number;
  deposits: number;
  balance: number;
}

export interface DashboardAccounting {
  totalMeals: number;
  totalExpenses: number;
  totalDeposits: number;
  mealRate: number;
  netBalance: number;
  consumerRows: DashboardConsumerRow[];
}

export interface DashboardPdfData extends DashboardAccounting {
  messName: string;
  periodStart: string;
  periodEnd: string;
  consumerCount: number;
}
