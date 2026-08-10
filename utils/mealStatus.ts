import type { MealDraft } from "@/types/mealStatus";

export const localDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayDate = (): string => localDateString(new Date());

export const addDays = (dateString: string, numberOfDays: number): string => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  date.setDate(date.getDate() + numberOfDays);
  return localDateString(date);
};

export const formatDateLabel = (dateString: string, today: string): string => {
  if (dateString === today) return "Today";

  const date = new Date(`${dateString}T00:00:00`);
  const difference = Math.round(
    (date.getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000,
  );

  if (difference === 1) return "Tomorrow";
  if (difference === -1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const isValidTime = (time: string): boolean => {
  if (!time) return true;
  if (!/^\d{2}:\d{2}$/.test(time)) return false;
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) < 24 && (minute ?? 0) < 60;
};

export const formatTime12Hour = (time: string): string => {
  const [rawHour, rawMinute] = time.split(":").map(Number);
  if (!Number.isInteger(rawHour) || !Number.isInteger(rawMinute)) return time;
  const period = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 || 12;
  return `${hour}:${String(rawMinute).padStart(2, "0")} ${period}`;
};

export const serializeMealDraft = (draft: MealDraft): string =>
  JSON.stringify(draft);
