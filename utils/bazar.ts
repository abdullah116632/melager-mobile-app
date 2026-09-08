/**
 * Bazar items are kept per calendar date, while bazar duty rotates weekly.
 * Weekday 0 is Saturday and weekday 6 is Friday, matching the backend.
 */
export const BAZAR_WEEKDAY_NAMES = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

const toLocalDate = (date: string): Date => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
};

/** Weekday index (0 = Saturday) the duty rotation uses for a bazar date. */
export const getBazarWeekday = (date: string): number =>
  (toLocalDate(date).getDay() + 1) % 7;

export const getBazarWeekdayName = (date: string): string =>
  BAZAR_WEEKDAY_NAMES[getBazarWeekday(date)] ?? "Selected day";

/** "12 Oct 2025" — the date a bazar list belongs to. */
export const formatBazarDate = (date: string): string =>
  toLocalDate(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
