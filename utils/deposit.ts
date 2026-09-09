import type { DepositEntry } from "@/types/deposit";

// `Number.prototype.toLocaleString` builds a fresh formatter on every call,
// which the deposits table pays for once per member plus the month total. Two
// shared formatters produce the same strings; runtimes without Intl fall back
// to the per-call form.
const buildFormatter = (options?: Intl.NumberFormatOptions) => {
  try {
    return new Intl.NumberFormat("en-IN", options);
  } catch {
    return null;
  }
};

const integerFormatter = buildFormatter();
const decimalFormatter = buildFormatter({
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export const formatDepositAmount = (amount: number): string => {
  if (amount === 0) return "0";
  if (Number.isInteger(amount)) {
    return integerFormatter?.format(amount) ?? amount.toLocaleString("en-IN");
  }
  return (
    decimalFormatter?.format(amount) ??
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })
  );
};

export const formatDepositTimestamp = (isoDate: string): string => {
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year}  ${hour}:${minute}`;
};

export const getCurrentDepositDate = (): string => {
  const date = new Date();
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
};

export const getCurrentDepositTime = (): string => {
  const date = new Date();
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};

export const formatDepositPickerDate = (dateString: string): string => {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return dateString;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDepositTime = (timeString: string): string => {
  const [rawHour, rawMinute] = timeString.split(":").map(Number);
  if (!Number.isInteger(rawHour) || !Number.isInteger(rawMinute)) {
    return timeString;
  }
  const period = rawHour >= 12 ? "PM" : "AM";
  return `${rawHour % 12 || 12}:${String(rawMinute).padStart(2, "0")} ${period}`;
};

export const getConsumerDepositEntries = (
  entries: DepositEntry[],
  consumerId: string,
) => entries.filter((entry) => entry.consumerId.toString() === consumerId);

export const getDepositTotal = (entries: DepositEntry[]): number =>
  entries.reduce((sum, entry) => sum + entry.amount, 0);

/**
 * Splits a deposit timestamp into the local year-month and day-of-month keys
 * used by `MonthData.deposits`. Returns null for an unparsable timestamp so
 * callers can skip the entry instead of writing a `NaN` bucket.
 */
export const getDepositEntryDateParts = (entry: DepositEntry) => {
  const date = new Date(entry.depositedAt);
  if (Number.isNaN(date.getTime())) return null;
  return {
    yearMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    day: date.getDate().toString(),
  };
};

/**
 * Rebuilds the `consumerId -> day -> amount` map that the dashboard accounting
 * reads. Both the deposits screen and the month snapshot derive their totals
 * from here so the two can never disagree about the same local rows.
 */
export const buildMonthlyDepositMap = (
  entries: DepositEntry[],
  yearMonth: string,
): Record<string, Record<string, number>> => {
  const month: Record<string, Record<string, number>> = {};
  for (const entry of entries) {
    const dateParts = getDepositEntryDateParts(entry);
    if (!dateParts || dateParts.yearMonth !== yearMonth) continue;
    const consumerId = entry.consumerId.toString();
    month[consumerId] ??= {};
    month[consumerId][dateParts.day] =
      (month[consumerId][dateParts.day] ?? 0) + entry.amount;
  }
  return month;
};
