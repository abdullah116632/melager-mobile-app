import {
  createAsyncThunk,
  createSlice,
  isFulfilled,
  isPending,
  isRejected,
} from "@reduxjs/toolkit";

import { api, type MonthData } from "@/lib/api";
import { getOfflineDatabase } from "@/offline/database/connection";
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
  Record<string, { items: DayExpenseItem[] }>
>;

export interface ExpenseState {
  months: ExpenseData;
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

export const setExpense = createAsyncThunk.withTypes<{
  state: ExpenseRootState;
}>()<
  {
    messId: number;
    yearMonth: string;
    day: number;
    items: DayExpenseItem[];
  },
  SetExpenseArgs
>(
  "expenses/setExpense",
  async ({ yearMonth, day, items }, { getState }) => {
    const { token, activeMess, user } = getState().auth;
    if (!activeMess || !user) {
      throw new Error("Please select a mess and sign in again.");
    }
    try{const database=await getOfflineDatabase();await new ExpenseRepository(database).save(user.id,activeMess.id,yearMonth,day,items);if(token&&getState().network.isOnline)void getOfflineRuntime(database).engine.sync({userId:user.id,messId:activeMess.id,token},{force:true});return {messId:activeMess.id,yearMonth,day,items};}catch{if(!token)throw new Error("Local expense storage is unavailable.");}
    await api.setExpense(yearMonth, day, items, token, activeMess.id);
    return { messId: activeMess.id, yearMonth, day, items };
  },
);

const applyMonthData = (
  state: ExpenseState,
  messId: number,
  yearMonth: string,
  data: MonthData,
) => {
  if (state.scopeMessId !== messId) return;
  state.months[yearMonth] = data.expenses;
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
      .addCase(loadMonth.fulfilled, (state, action) => {
        const { messId, yearMonth, data } = action.payload;
        if (data) applyMonthData(state, messId, yearMonth, data);
      })
      .addCase(setExpense.fulfilled, (state, action) => {
        const { messId, yearMonth, day, items } = action.payload;
        if (state.scopeMessId !== messId) return;
        state.months[yearMonth] ??= {};
        state.months[yearMonth][day.toString()] = { items };
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
