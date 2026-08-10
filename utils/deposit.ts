import type { DepositEntry } from "@/types/deposit";

export const formatDepositAmount = (amount: number): string => {
  if (amount === 0) return "0";
  if (Number.isInteger(amount)) return amount.toLocaleString("en-IN");
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
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
