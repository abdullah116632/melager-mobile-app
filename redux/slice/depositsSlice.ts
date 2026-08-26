import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type MonthData } from "@/lib/api";
import type { AuthState } from "@/redux/slice/authSlice";
import {
  loadMonth,
  monthDataReceived,
  removeConsumer,
  syncMessScope,
} from "@/redux/slice/messSlice";
import {
  addDepositEntry as createDepositEntryRequest,
  deleteDepositEntry as deleteDepositEntryRequest,
  getDepositEntries as getDepositEntriesRequest,
  updateDepositEntry as updateDepositEntryRequest,
} from "@/services/depositService";
import type { DepositEntry, DepositEntryInput } from "@/types/deposit";

export type DepositData = Record<
  string,
  Record<string, Record<string, number>>
>;

export interface DepositsState {
  months: DepositData;
  entriesByMonth: Record<string, DepositEntry[]>;
  loadedEntryMonths: Record<string, true>;
  loadingEntryMonths: Record<string, true>;
  entryErrors: Record<string, string | undefined>;
  scopeMessId: number | null;
}

type DepositsRootState = {
  auth: AuthState;
  deposits: DepositsState;
};

const createInitialState = (
  scopeMessId: number | null = null,
): DepositsState => ({
  months: {},
  entriesByMonth: {},
  loadedEntryMonths: {},
  loadingEntryMonths: {},
  entryErrors: {},
  scopeMessId,
});

const getEntryDateParts = (entry: DepositEntry) => {
  const date = new Date(entry.depositedAt);
  if (Number.isNaN(date.getTime())) return null;
  return {
    yearMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    day: date.getDate().toString(),
  };
};

const rebuildMonthlyDeposits = (state: DepositsState, yearMonth: string) => {
  const month: Record<string, Record<string, number>> = {};
  for (const entry of state.entriesByMonth[yearMonth] ?? []) {
    const dateParts = getEntryDateParts(entry);
    if (!dateParts || dateParts.yearMonth !== yearMonth) continue;
    const consumerId = entry.consumerId.toString();
    month[consumerId] ??= {};
    month[consumerId][dateParts.day] =
      (month[consumerId][dateParts.day] ?? 0) + entry.amount;
  }
  state.months[yearMonth] = month;
};

const createDepositsAsyncThunk = createAsyncThunk.withTypes<{
  state: DepositsRootState;
}>();

interface SetDepositArgs {
  yearMonth: string;
  consumerId: string;
  day: number;
  amount: number;
  isOnline: boolean;
}

export const setDeposit = createDepositsAsyncThunk<void, SetDepositArgs>(
  "deposits/setDeposit",
  async ({ yearMonth, consumerId, day, amount }, { getState }) => {
    const { token, activeMess } = getState().auth;
    if (!token || !activeMess) return;
    await api
      .setDeposit(consumerId, yearMonth, day, amount, token, activeMess.id)
      .catch(() => undefined);
  },
  {
    condition: ({ isOnline }) => isOnline,
  },
);

interface LoadDepositEntriesArgs {
  messId: number;
  yearMonth: string;
  force?: boolean;
}

export const loadDepositEntries = createDepositsAsyncThunk<
  { messId: number; yearMonth: string; entries: DepositEntry[] },
  LoadDepositEntriesArgs
>(
  "deposits/loadEntries",
  async ({ messId, yearMonth }, { getState }) => {
    const { token, activeMess } = getState().auth;
    if (!token || !activeMess || activeMess.id !== messId) {
      throw new Error("Please select a mess and sign in again.");
    }
    const entries = await getDepositEntriesRequest(messId, yearMonth, token);
    return { messId, yearMonth, entries };
  },
  {
    condition: ({ messId, yearMonth, force = false }, { getState }) => {
      const state = getState();
      if (!state.auth.token || state.auth.activeMess?.id !== messId)
        return false;
      if (state.deposits.scopeMessId !== messId) return false;
      if (state.deposits.loadingEntryMonths[yearMonth]) return false;
      return force || !state.deposits.loadedEntryMonths[yearMonth];
    },
  },
);

interface AddDepositEntryArgs {
  yearMonth: string;
  data: DepositEntryInput;
}

export const addDepositEntry = createDepositsAsyncThunk<
  { messId: number; yearMonth: string; entry: DepositEntry },
  AddDepositEntryArgs
>("deposits/addEntry", async ({ yearMonth, data }, { getState }) => {
  const { token, activeMess } = getState().auth;
  if (!token || !activeMess || activeMess.id !== data.messId) {
    throw new Error("Please select a mess and sign in again.");
  }
  const entry = await createDepositEntryRequest(data, token);
  return { messId: activeMess.id, yearMonth, entry };
});

interface UpdateDepositEntryArgs {
  yearMonth: string;
  entryId: number;
  data: Omit<DepositEntryInput, "consumerId">;
}

export const updateDepositEntry = createDepositsAsyncThunk<
  { messId: number; yearMonth: string; entry: DepositEntry },
  UpdateDepositEntryArgs
>(
  "deposits/updateEntry",
  async ({ yearMonth, entryId, data }, { getState }) => {
    const { token, activeMess } = getState().auth;
    if (!token || !activeMess || activeMess.id !== data.messId) {
      throw new Error("Please select a mess and sign in again.");
    }
    const entry = await updateDepositEntryRequest(entryId, data, token);
    return { messId: activeMess.id, yearMonth, entry };
  },
);

interface DeleteDepositEntryArgs {
  yearMonth: string;
  entryId: number;
}

export const deleteDepositEntry = createDepositsAsyncThunk<
  DeleteDepositEntryArgs & { messId: number },
  DeleteDepositEntryArgs
>("deposits/deleteEntry", async ({ yearMonth, entryId }, { getState }) => {
  const { token, activeMess } = getState().auth;
  if (!token || !activeMess) {
    throw new Error("Please select a mess and sign in again.");
  }
  await deleteDepositEntryRequest(entryId, activeMess.id, token);
  return { messId: activeMess.id, yearMonth, entryId };
});

const applyMonthData = (
  state: DepositsState,
  messId: number,
  yearMonth: string,
  data: MonthData,
) => {
  if (state.scopeMessId !== messId) return;
  state.months[yearMonth] = data.deposits;
};

const depositsSlice = createSlice({
  name: "deposits",
  initialState: createInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(syncMessScope, (state, action) => {
        if (state.scopeMessId === action.payload) return;
        return createInitialState(action.payload);
      })
      .addCase(monthDataReceived, (state, action) => {
        applyMonthData(
          state,
          action.payload.messId,
          action.payload.yearMonth,
          action.payload.data,
        );
      })
      .addCase(loadMonth.fulfilled, (state, action) => {
        const { messId, yearMonth, data } = action.payload;
        if (data) applyMonthData(state, messId, yearMonth, data);
      })
      .addCase(removeConsumer.fulfilled, (state, action) => {
        if (!action.payload.removed) return;
        Object.values(state.months).forEach((month) => {
          delete month[action.payload.id];
        });
        Object.values(state.entriesByMonth).forEach((entries) => {
          const consumerId = Number(action.payload.id);
          entries.splice(
            0,
            entries.length,
            ...entries.filter((entry) => entry.consumerId !== consumerId),
          );
        });
      })
      .addCase(setDeposit.pending, (state, action) => {
        const { yearMonth, consumerId, day, amount } = action.meta.arg;
        state.months[yearMonth] ??= {};
        state.months[yearMonth][consumerId] ??= {};
        state.months[yearMonth][consumerId][day.toString()] = amount;
      })
      .addCase(loadDepositEntries.pending, (state, action) => {
        const { yearMonth } = action.meta.arg;
        state.loadingEntryMonths[yearMonth] = true;
        delete state.entryErrors[yearMonth];
      })
      .addCase(loadDepositEntries.fulfilled, (state, action) => {
        const { messId, yearMonth, entries } = action.payload;
        delete state.loadingEntryMonths[yearMonth];
        if (state.scopeMessId !== messId) return;
        state.entriesByMonth[yearMonth] = entries;
        state.loadedEntryMonths[yearMonth] = true;
        delete state.entryErrors[yearMonth];
        rebuildMonthlyDeposits(state, yearMonth);
      })
      .addCase(loadDepositEntries.rejected, (state, action) => {
        const { messId, yearMonth } = action.meta.arg;
        delete state.loadingEntryMonths[yearMonth];
        if (action.meta.condition) return;
        if (state.scopeMessId !== messId) return;
        state.entryErrors[yearMonth] =
          action.error.message ?? "Unable to load deposits. Please try again.";
      })
      .addCase(addDepositEntry.fulfilled, (state, action) => {
        const { messId, yearMonth, entry } = action.payload;
        if (state.scopeMessId !== messId) return;
        state.entriesByMonth[yearMonth] ??= [];
        if (getEntryDateParts(entry)?.yearMonth === yearMonth) {
          state.entriesByMonth[yearMonth].push(entry);
        }
        state.loadedEntryMonths[yearMonth] = true;
        rebuildMonthlyDeposits(state, yearMonth);
      })
      .addCase(updateDepositEntry.fulfilled, (state, action) => {
        const { messId, yearMonth, entry } = action.payload;
        if (state.scopeMessId !== messId) return;
        const entries = state.entriesByMonth[yearMonth] ?? [];
        const index = entries.findIndex((item) => item.id === entry.id);
        if (index >= 0) entries.splice(index, 1);
        if (getEntryDateParts(entry)?.yearMonth === yearMonth) {
          entries.push(entry);
        }
        state.entriesByMonth[yearMonth] = entries;
        rebuildMonthlyDeposits(state, yearMonth);
      })
      .addCase(deleteDepositEntry.fulfilled, (state, action) => {
        const { messId, yearMonth, entryId } = action.payload;
        if (state.scopeMessId !== messId) return;
        const entries = state.entriesByMonth[yearMonth];
        if (!entries) return;
        state.entriesByMonth[yearMonth] = entries.filter(
          (entry) => entry.id !== entryId,
        );
        rebuildMonthlyDeposits(state, yearMonth);
      });
  },
});

export const selectDepositsState = (state: DepositsRootState) => state.deposits;

export default depositsSlice.reducer;
