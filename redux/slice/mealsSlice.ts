import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type MonthData } from "@/lib/api";
import { getOfflineDatabase } from "@/offline/database/connection";
import { DailyMealsRepository } from "@/offline/features/dailyMeals/DailyMealsRepository";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import type { AuthState } from "@/redux/slice/authSlice";
import type { NetworkState } from "@/redux/slice/networkSlice";
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
  network: NetworkState;
};

const createInitialState = (scopeMessId: number | null = null): MealsState => ({
  months: {},
  scopeMessId,
});

export const hydrateDailyMealMonthFromLocal = createAsyncThunk.withTypes<{
  state: MealsRootState;
}>()<
  { messId: number; yearMonth: string; meals: MealData[string] } | null,
  { messId: number; yearMonth: string }
>(
  "meals/hydrateMonthFromLocal",
  async ({ messId, yearMonth }, { getState }) => {
    const { user, activeMess } = getState().auth;
    if (!user || activeMess?.id !== messId) return null;
    const meals = await new DailyMealsRepository(
      await getOfflineDatabase(),
    ).getMonth(user.id, messId, yearMonth);
    return { messId, yearMonth, meals };
  },
);

interface SetMealArgs {
  yearMonth: string;
  consumerId: string;
  day: number;
  count: number;
  isOnline: boolean;
}

export const dailyMealConflictResolved = createAction<{
  yearMonth: string;
  consumerId: string;
  day: number;
  count: number;
}>("meals/dailyMealConflictResolved");

export const setMeal = createAsyncThunk.withTypes<{
  state: MealsRootState;
}>()<void, SetMealArgs>(
  "meals/setMeal",
  async ({ yearMonth, consumerId, day, count }, { getState }) => {
    const { token, activeMess, user } = getState().auth;
    if (!activeMess || !user) return;
    try {
      const database = await getOfflineDatabase();
      await new DailyMealsRepository(database).update(
        user.id,
        activeMess.id,
        yearMonth,
        consumerId,
        day,
        count,
      );
      if (token && getState().network.isOnline)
        void getOfflineRuntime(database).engine.sync(
          { userId: user.id, messId: activeMess.id, token },
          { collections: ["daily_meals"], force: true },
        );
      return;
    } catch {
      if (token && getState().network.isOnline)
        await api.setMeal(
          consumerId,
          yearMonth,
          day,
          count,
          token,
          activeMess.id,
        );
    }
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
      .addCase(hydrateDailyMealMonthFromLocal.fulfilled, (state, action) => {
        if (!action.payload || state.scopeMessId !== action.payload.messId)
          return;
        state.months[action.payload.yearMonth] = action.payload.meals;
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
      })
      .addCase(dailyMealConflictResolved, (state, action) => {
        const { yearMonth, consumerId, day, count } = action.payload;
        state.months[yearMonth] ??= {};
        state.months[yearMonth][consumerId] ??= {};
        state.months[yearMonth][consumerId][String(day)] = count;
      });
  },
});

export const selectMealsState = (state: MealsRootState) => state.meals;

export default mealsSlice.reducer;
