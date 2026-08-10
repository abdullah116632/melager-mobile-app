import { api } from "@/lib/api";
import { enqueue } from "@/lib/offlineQueue";
import type { DepositEntry, DepositEntryInput } from "@/types/deposit";

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

export const queueDepositEntry = async (
  data: DepositEntryInput,
  token: string,
): Promise<DepositEntry> => {
  await enqueue({
    type: "ADD_DEPOSIT_ENTRY",
    key: `deposit_entry:${Date.now()}:${Math.random()}`,
    payload: data,
    token,
  });
  return {
    id: -Date.now(),
    consumerId: data.consumerId,
    amount: data.amount,
    depositedAt: data.depositedAt,
    note: data.note ?? null,
  };
};

export const deleteDepositEntry = (
  entryId: number,
  messId: number,
  token: string,
) => api.deleteDepositEntry(entryId, messId, token);
