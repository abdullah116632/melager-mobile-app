import {
  createAsyncThunk,
  createSlice,
  isFulfilled,
  isPending,
  isRejected,
} from "@reduxjs/toolkit";

import { api, type MonthData } from "@/lib/api";
import {
  getOfflineDatabase,
  isOfflineDatabaseSupported,
} from "@/offline/database/connection";
import { ExpenseRepository } from "@/offline/features/expenses/ExpenseRepository";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import type { AuthState } from "@/redux/slice/authSlice";
import {
  loadMonth,
  monthDataReceived,
  syncMessScope,
} from "@/redux/slice/messSlice";
import type { DayExpenseItem } from "@/types/mess";

export type ExpenseData = Record<
  string,
  Record<string, { items: DayExpenseItem[]; conflictMessage?: string | null }>
>;

export interface ExpenseState {
  months: ExpenseData;
  loadedMonths: Record<string, true>;
  scopeMessId: number | null;
  requestStatus: "idle" | "loading" | "succeeded" | "failed";
  requestError: string | null;
}

type ExpenseRootState = {
  auth: AuthState;
  expenses: ExpenseState;
  network: { isOnline: boolean };
};

const createInitialState = (
  scopeMessId: number | null = null,
): ExpenseState => ({
  months: {},
  loadedMonths: {},
  scopeMessId,
  requestStatus: "idle",
  requestError: null,
});

interface SetExpenseArgs {
  yearMonth: string;
  day: number;
  items: DayExpenseItem[];
  isOnline: boolean;
}

interface HydrateExpenseMonthArgs {
  messId: number;
  yearMonth: string;
}

export const hydrateExpenseMonth = createAsyncThunk.withTypes<{
  state: ExpenseRootState;
}>()<
  {
    messId: number;
    yearMonth: string;
    expenses: Record<
      string,
      { items: DayExpenseItem[]; conflictMessage?: string | null }
    >;
  } | null,
  HydrateExpenseMonthArgs
>("expenses/hydrateMonth", async ({ messId, yearMonth }, { getState }) => {
  const { activeMess, user } = getState().auth;
  if (!isOfflineDatabaseSupported() || !user || activeMess?.id !== messId) {
    return null;
  }
  try {
    const expenses = await new ExpenseRepository(
      await getOfflineDatabase(),
    ).getMonth(user.id, messId, yearMonth);
    return { messId, yearMonth, expenses };
  } catch {
    return null;
  }
});

export const setExpense = createAsyncThunk.withTypes<{
  state: ExpenseRootState;
}>()<
  {
    messId: number;
    yearMonth: string;
    day: number;
    items: DayExpenseItem[];
    conflictMessage: string | null;
  },
  SetExpenseArgs
>("expenses/setExpense", async ({ yearMonth, day, items }, { dispatch, getState }) => {
  const { token, activeMess, user } = getState().auth;
  if (!activeMess || !user) {
    throw new Error("Please select a mess and sign in again.");
  }
  if (isOfflineDatabaseSupported()) {
    try {
      const database = await getOfflineDatabase();
      await new ExpenseRepository(database).save(
        user.id,
        activeMess.id,
        yearMonth,
        day,
        items,
      );

      // Local SQLite is committed before this thunk resolves, so the reducer
      // updates the visible day immediately. Remote sync deliberately runs in
      // the background; a lost connection leaves the outbox row for retry.
      if (token && getState().network.isOnline) {
        void getOfflineRuntime(database)
          .engine.sync(
            { userId: user.id, messId: activeMess.id, token },
            { collections: ["expenses"], force: true },
          )
          .then(() =>
            dispatch(
              hydrateExpenseMonth({
                messId: activeMess.id,
                yearMonth,
              }),
            ),
          )
          .catch(() => undefined);
      }

      return {
        messId: activeMess.id,
        yearMonth,
        day,
        items,
        conflictMessage: null,
      };
    } catch {
      if (!token) throw new Error("Local expense storage is unavailable.");
    }
  }
  if (!token) throw new Error("Local expense storage is unavailable.");
  await api.setExpense(yearMonth, day, items, token, activeMess.id);
  return {
    messId: activeMess.id,
    yearMonth,
    day,
    items,
    conflictMessage: null,
  };
});

const applyMonthData = (
  state: ExpenseState,
  messId: number,
  yearMonth: string,
  data: MonthData,
) => {
  if (state.scopeMessId !== messId) return;
  state.months[yearMonth] = data.expenses;
  state.loadedMonths[yearMonth] = true;
};

const expenseSlice = createSlice({
  name: "expenses",
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
      .addCase(hydrateExpenseMonth.fulfilled, (state, action) => {
        if (!action.payload || state.scopeMessId !== action.payload.messId)
          return;
        state.months[action.payload.yearMonth] = action.payload.expenses;
        state.loadedMonths[action.payload.yearMonth] = true;
      })
      .addCase(loadMonth.fulfilled, (state, action) => {
        const { messId, yearMonth, data } = action.payload;
        if (data) {
          applyMonthData(state, messId, yearMonth, data);
        }
      })
      .addCase(setExpense.fulfilled, (state, action) => {
        const { messId, yearMonth, day, items, conflictMessage } =
          action.payload;
        if (state.scopeMessId !== messId) return;
        state.months[yearMonth] ??= {};
        state.months[yearMonth][day.toString()] = {
          items,
          conflictMessage,
        };
        state.loadedMonths[yearMonth] = true;
      })
      .addMatcher(isPending(setExpense), (state) => {
        state.requestStatus = "loading";
        state.requestError = null;
      })
      .addMatcher(isFulfilled(setExpense), (state) => {
        state.requestStatus = "succeeded";
        state.requestError = null;
      })
      .addMatcher(isRejected(setExpense), (state, action) => {
        state.requestStatus = "failed";
        state.requestError = action.error.message ?? "Request failed";
      });
  },
});

export const selectExpenseState = (state: ExpenseRootState) => state.expenses;

export default expenseSlice.reducer;
