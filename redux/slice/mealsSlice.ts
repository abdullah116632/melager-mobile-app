import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type MonthData } from "@/lib/api";
import { getOfflineDatabase } from "@/offline/database/connection";
import { DailyMealsRepository } from "@/offline/features/dailyMeals/DailyMealsRepository";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import type { AuthState } from "@/redux/slice/authSlice";
import { apiActionFailed, type NetworkState } from "@/redux/slice/networkSlice";
import {
  loadMonth,
  monthDataReceived,
  removeConsumer,
  syncMessScope,
} from "@/redux/slice/messSlice";

export type MealData = Record<string, Record<string, Record<string, number>>>;

/**
 * The previous value of a cell whose optimistic write is still in flight, so a
 * failed write can be undone instead of leaving a number on screen that was
 * never stored anywhere.
 */
interface PendingMealWrite {
  yearMonth: string;
  consumerId: string;
  day: string;
  /** What this request optimistically wrote. */
  count: number;
  /** null when the cell did not exist before. */
  previous: number | null;
}

export interface MealsState {
  months: MealData;
  scopeMessId: number | null;
  pendingWrites: Record<string, PendingMealWrite>;
}

type MealsRootState = {
  auth: AuthState;
  meals: MealsState;
  network: NetworkState;
};

const createInitialState = (scopeMessId: number | null = null): MealsState => ({
  months: {},
  scopeMessId,
  pendingWrites: {},
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
  async ({ yearMonth, consumerId, day, count }, { dispatch, getState }) => {
    const { token, activeMess, user } = getState().auth;
    if (!activeMess || !user) {
      dispatch(apiActionFailed("Meal not saved. Please sign in again."));
      throw new Error("No active mess or signed-in user.");
    }
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
      if (token && getState().network.isOnline) {
        void getOfflineRuntime(database)
          .engine.sync(
            { userId: user.id, messId: activeMess.id, token },
            { collections: ["daily_meals"], force: true },
          )
          .then(() =>
            dispatch(
              hydrateDailyMealMonthFromLocal({
                messId: activeMess.id,
                yearMonth,
              }),
            ),
          )
          .catch(() => undefined);
      }
      return;
    } catch (localWriteError) {
      // SQLite refused the edit. While online the server is still reachable,
      // so try it directly rather than dropping the value.
      if (token && getState().network.isOnline) {
        try {
          await api.setMeal(
            consumerId,
            yearMonth,
            day,
            count,
            token,
            activeMess.id,
          );
          return;
        } catch {
          // Neither store accepted it; fall through to the rollback.
        }
      }
      // Nothing holds this number now. Leaving it on screen would show a meal
      // count that exists on no device and in no ledger, which is worse than
      // showing the save failed — this is an accounting screen.
      dispatch(apiActionFailed("Meal not saved. Please try again."));
      throw localWriteError;
    }
  },
);

/**
 * Points every still-in-flight write on the same cell at the value that is now
 * known to be stored there, so a chain of rapid edits rolls back to the right
 * number rather than to another unconfirmed one.
 */
const rebaseLaterWrites = (
  state: MealsState,
  settled: PendingMealWrite,
  storedValue: number | null,
) => {
  for (const other of Object.values(state.pendingWrites)) {
    if (
      other.yearMonth === settled.yearMonth &&
      other.consumerId === settled.consumerId &&
      other.day === settled.day
    ) {
      other.previous = storedValue;
    }
  }
};

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
        const dayKey = day.toString();
        state.months[yearMonth] ??= {};
        state.months[yearMonth][consumerId] ??= {};
        const cell = state.months[yearMonth][consumerId];
        state.pendingWrites[action.meta.requestId] = {
          yearMonth,
          consumerId,
          day: dayKey,
          count,
          previous: cell[dayKey] ?? null,
        };
        cell[dayKey] = count;
      })
      .addCase(setMeal.fulfilled, (state, action) => {
        const write = state.pendingWrites[action.meta.requestId];
        delete state.pendingWrites[action.meta.requestId];
        if (!write) return;
        // This value is stored now, so it is what a later write on the same
        // cell has to fall back to if that one fails.
        rebaseLaterWrites(state, write, write.count);
      })
      .addCase(setMeal.rejected, (state, action) => {
        const write = state.pendingWrites[action.meta.requestId];
        delete state.pendingWrites[action.meta.requestId];
        if (!write) return;
        // This value was never stored, so a later write on the same cell must
        // fall back past it to whatever this one would have restored.
        rebaseLaterWrites(state, write, write.previous);
        const cell = state.months[write.yearMonth]?.[write.consumerId];
        // A newer edit already replaced this value and owns the cell now —
        // rolling back here would undo that newer write instead.
        if (!cell || cell[write.day] !== write.count) return;
        if (write.previous === null) delete cell[write.day];
        else cell[write.day] = write.previous;
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
