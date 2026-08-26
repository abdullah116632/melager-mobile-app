import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type MonthData } from "@/lib/api";
import type { AuthState } from "@/redux/slice/authSlice";
import {
  loadMonth,
  monthDataReceived,
  removeConsumer,
  syncMessScope,
} from "@/redux/slice/messSlice";

export type MealData = Record<string, Record<string, Record<string, number>>>;

export interface MealsState {
  months: MealData;
  scopeMessId: number | null;
}

type MealsRootState = {
  auth: AuthState;
  meals: MealsState;
};

const createInitialState = (scopeMessId: number | null = null): MealsState => ({
  months: {},
  scopeMessId,
});

interface SetMealArgs {
  yearMonth: string;
  consumerId: string;
  day: number;
  count: number;
  isOnline: boolean;
}

export const setMeal = createAsyncThunk.withTypes<{
  state: MealsRootState;
}>()<void, SetMealArgs>(
  "meals/setMeal",
  async ({ yearMonth, consumerId, day, count }, { getState }) => {
    const { token, activeMess } = getState().auth;
    if (!token || !activeMess) return;
    await api
      .setMeal(consumerId, yearMonth, day, count, token, activeMess.id)
      .catch(() => undefined);
  },
  {
    condition: ({ isOnline }) => isOnline,
  },
);

const applyMonthData = (
  state: MealsState,
  messId: number,
  yearMonth: string,
  data: MonthData,
) => {
  if (state.scopeMessId !== messId) return;
  state.months[yearMonth] = data.meals;
};

const mealsSlice = createSlice({
  name: "meals",
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
      })
      .addCase(setMeal.pending, (state, action) => {
        const { yearMonth, consumerId, day, count } = action.meta.arg;
        state.months[yearMonth] ??= {};
        state.months[yearMonth][consumerId] ??= {};
        state.months[yearMonth][consumerId][day.toString()] = count;
      });
  },
});

export const selectMealsState = (state: MealsRootState) => state.meals;

export default mealsSlice.reducer;
