import { api } from "@/lib/api";
import type { DepositEntryInput } from "@/types/deposit";

export const getDepositEntries = async (
  messId: number,
  yearMonth: string,
  token: string,
) => {
  const { entries } = await api.getDepositEntries(messId, yearMonth, token);
  return entries;
};

export const addDepositEntry = async (
  data: DepositEntryInput,
  token: string,
) => {
  const { entry } = await api.addDepositEntry(data, token);
  return entry;
};

export const deleteDepositEntry = (
  entryId: number,
  messId: number,
  token: string,
) => api.deleteDepositEntry(entryId, messId, token);
