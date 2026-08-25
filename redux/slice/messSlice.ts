import {
  createAction,
  createAsyncThunk,
  createSlice,
  isFulfilled,
  isPending,
  isRejected,
  unwrapResult,
} from "@reduxjs/toolkit";

import { api, clearApiCache, type MonthData } from "@/lib/api";
import { loadFromCache, saveToCache } from "@/lib/cache";
import type { AuthState } from "@/redux/slice/authSlice";
import type { Consumer, DayExpenseItem } from "@/types/mess";

type MealData = Record<string, Record<string, Record<string, number>>>;
type ExpenseData = Record<
  string,
  Record<string, { items: DayExpenseItem[] }>
>;
type DepositData = Record<string, Record<string, Record<string, number>>>;

export interface MessState {
  consumers: Consumer[];
  meals: MealData;
  expenses: ExpenseData;
  deposits: DepositData;
  currentYear: number;
  currentMonth: number;
  scopeMessId: number | null;
  loadedMonths: Record<string, true>;
  loadingMonths: Record<string, true>;
  dataLoading: boolean;
  requestStatus: "idle" | "loading" | "succeeded" | "failed";
  requestError: string | null;
}

type MessRootState = {
  auth: AuthState;
  mess: MessState;
};

const now = new Date();

const createInitialState = (
  currentYear = now.getFullYear(),
  currentMonth = now.getMonth() + 1,
  scopeMessId: number | null = null,
): MessState => ({
  consumers: [],
  meals: {},
  expenses: {},
  deposits: {},
  currentYear,
  currentMonth,
  scopeMessId,
  loadedMonths: {},
  loadingMonths: {},
  dataLoading: false,
  requestStatus: "idle",
  requestError: null,
});

const initialState = createInitialState();

const monthKey = (messId: number, yearMonth: string) =>
  `${messId}:${yearMonth}`;

export const syncMessScope = createAction<number | null>("mess/syncScope");
export const goToPreviousMonth = createAction("mess/goToPreviousMonth");
export const goToFollowingMonth = createAction("mess/goToFollowingMonth");
export const goToSpecificMonth = createAction<{ year: number; month: number }>(
  "mess/goToSpecificMonth",
);

const monthDataReceived = createAction<{
  messId: number;
  yearMonth: string;
  data: MonthData;
}>("mess/monthDataReceived");

const createMessAsyncThunk = createAsyncThunk.withTypes<{
  state: MessRootState;
}>();

interface LoadMonthArgs {
  messId: number;
  yearMonth: string;
  force?: boolean;
}

interface LoadMonthResult extends LoadMonthArgs {
  data: MonthData | null;
}

export const loadMonth = createMessAsyncThunk<LoadMonthResult, LoadMonthArgs>(
  "mess/loadMonth",
  async ({ messId, yearMonth, force = false }, { dispatch, getState }) => {
    const { token, activeMess } = getState().auth;
    if (!token || activeMess?.id !== messId) {
      return { messId, yearMonth, force, data: null };
    }

    const key = monthKey(messId, yearMonth);
    const alreadyLoaded = Boolean(getState().mess.loadedMonths[key]);

    // Preserve the previous cache-first behavior while the network request is
    // already in flight.
    const networkRequest = api
      .getMonthData(yearMonth, token, messId)
      .catch(() => null);

    if (!alreadyLoaded && !force) {
      const cached = await loadFromCache(messId, yearMonth);
      if (cached) {
        dispatch(
          monthDataReceived({
            messId,
            yearMonth,
            data: cached as MonthData,
          }),
        );
      }
    }

    const data = await networkRequest;
    if (data) void saveToCache(messId, yearMonth, data);
    return { messId, yearMonth, force, data };
  },
  {
    condition: ({ messId, yearMonth }, { getState }) => {
      const state = getState();
      if (!state.auth.token || state.auth.activeMess?.id !== messId) return false;
      return !state.mess.loadingMonths[monthKey(messId, yearMonth)];
    },
  },
);

export const refreshMonth = createMessAsyncThunk<void, void>(
  "mess/refreshMonth",
  async (_arg, { dispatch, getState }) => {
    const state = getState();
    const messId = state.mess.scopeMessId;
    if (!messId) return;
    const yearMonth = formatYearMonth(
      state.mess.currentYear,
      state.mess.currentMonth,
    );
    clearApiCache();
    const result = await dispatch(loadMonth({ messId, yearMonth, force: true }));
    if (loadMonth.rejected.match(result) && result.meta.condition) return;
    unwrapResult(result);
  },
);

export const addConsumer = createMessAsyncThunk<
  { consumer: Consumer | null; invitationSent: boolean },
  {
    name: string;
    email: string;
    mobileNumber?: string;
    isOnline: boolean;
  }
>(
  "mess/addConsumer",
  async ({ name, email, mobileNumber, isOnline }, { getState }) => {
    if (!isOnline) throw new Error("Internet connection required.");
    const { token, activeMess } = getState().auth;
    if (!token || !activeMess) {
      throw new Error("Please select a mess and sign in again.");
    }
    const result = await api.addConsumer(
      name,
      email,
      mobileNumber,
      token,
      activeMess.id,
    );
    return {
      consumer: result.consumer
        ? { id: result.consumer.id.toString(), name: result.consumer.name }
        : null,
      invitationSent: result.invitationSent,
    };
  },
);

export const removeConsumer = createMessAsyncThunk<
  { id: string; removed: boolean },
  { id: string; isOnline: boolean }
>("mess/removeConsumer", async ({ id, isOnline }, { getState }) => {
  if (!isOnline) throw new Error("Internet connection required.");
  const { token, activeMess } = getState().auth;
  if (!token || !activeMess) return { id, removed: false };
  await api.removeConsumer(parseInt(id, 10), token, activeMess.id);
  return { id, removed: true };
});

interface SetMealArgs {
  yearMonth: string;
  consumerId: string;
  day: number;
  count: number;
  isOnline: boolean;
}

export const setMeal = createMessAsyncThunk<void, SetMealArgs>(
  "mess/setMeal",
  async ({ yearMonth, consumerId, day, count }, { getState }) => {
    const { token, activeMess } = getState().auth;
    if (!token || !activeMess) return;
    await api
      .setMeal(
        consumerId,
        yearMonth,
        day,
        count,
        token,
        activeMess.id,
      )
      .catch(() => undefined);
  },
  {
    condition: ({ isOnline }) => isOnline,
  },
);

export const setExpense = createMessAsyncThunk<
  { yearMonth: string; day: number; items: DayExpenseItem[] },
  {
    yearMonth: string;
    day: number;
    items: DayExpenseItem[];
    isOnline: boolean;
  }
>(
  "mess/setExpense",
  async ({ yearMonth, day, items, isOnline }, { getState }) => {
    if (!isOnline) throw new Error("Internet connection required.");
    const { token, activeMess } = getState().auth;
    if (!token || !activeMess) {
      throw new Error("Please select a mess and sign in again.");
    }
    await api.setExpense(yearMonth, day, items, token, activeMess.id);
    return { yearMonth, day, items };
  },
);

interface SetDepositArgs {
  yearMonth: string;
  consumerId: string;
  day: number;
  amount: number;
  isOnline: boolean;
}

export const setDeposit = createMessAsyncThunk<void, SetDepositArgs>(
  "mess/setDeposit",
  async ({ yearMonth, consumerId, day, amount }, { getState }) => {
    const { token, activeMess } = getState().auth;
    if (!token || !activeMess) return;
    await api
      .setDeposit(
        consumerId,
        yearMonth,
        day,
        amount,
        token,
        activeMess.id,
      )
      .catch(() => undefined);
  },
  {
    condition: ({ isOnline }) => isOnline,
  },
);

const messAsyncThunks = [
  loadMonth,
  refreshMonth,
  addConsumer,
  removeConsumer,
  setMeal,
  setExpense,
  setDeposit,
] as const;

const applyMonthData = (
  state: MessState,
  messId: number,
  yearMonth: string,
  data: MonthData,
) => {
  if (state.scopeMessId !== messId) return;
  state.consumers = data.consumers.map((consumer) => ({
    id: consumer.id.toString(),
    name: consumer.name,
  }));
  state.meals[yearMonth] = data.meals;
  state.expenses[yearMonth] = data.expenses;
  state.deposits[yearMonth] = data.deposits;
  state.loadedMonths[monthKey(messId, yearMonth)] = true;
};

const messSlice = createSlice({
  name: "mess",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(syncMessScope, (state, action) => {
        if (state.scopeMessId === action.payload) return;
        if (action.payload == null) {
          Object.assign(state, createInitialState());
          return;
        }
        Object.assign(
          state,
          createInitialState(
            state.currentYear,
            state.currentMonth,
            action.payload,
          ),
        );
      })
      .addCase(goToPreviousMonth, (state) => {
        state.currentMonth -= 1;
        if (state.currentMonth < 1) {
          state.currentMonth = 12;
          state.currentYear -= 1;
        }
      })
      .addCase(goToFollowingMonth, (state) => {
        state.currentMonth += 1;
        if (state.currentMonth > 12) {
          state.currentMonth = 1;
          state.currentYear += 1;
        }
      })
      .addCase(goToSpecificMonth, (state, action) => {
        state.currentYear = action.payload.year;
        state.currentMonth = action.payload.month;
      })
      .addCase(monthDataReceived, (state, action) => {
        applyMonthData(
          state,
          action.payload.messId,
          action.payload.yearMonth,
          action.payload.data,
        );
        if (state.scopeMessId === action.payload.messId) {
          state.dataLoading = false;
        }
      })
      .addCase(loadMonth.pending, (state, action) => {
        const { messId, yearMonth } = action.meta.arg;
        const key = monthKey(messId, yearMonth);
        state.loadingMonths[key] = true;
        if (!state.loadedMonths[key] && state.scopeMessId === messId) {
          state.dataLoading = true;
        }
      })
      .addCase(loadMonth.fulfilled, (state, action) => {
        const { messId, yearMonth, data } = action.payload;
        delete state.loadingMonths[monthKey(messId, yearMonth)];
        if (data) applyMonthData(state, messId, yearMonth, data);
        if (state.scopeMessId === messId) state.dataLoading = false;
      })
      .addCase(loadMonth.rejected, (state, action) => {
        const { messId, yearMonth } = action.meta.arg;
        delete state.loadingMonths[monthKey(messId, yearMonth)];
        if (state.scopeMessId === messId) state.dataLoading = false;
      })
      .addCase(addConsumer.fulfilled, (state, action) => {
        if (action.payload.consumer) {
          state.consumers.push(action.payload.consumer);
        }
      })
      .addCase(removeConsumer.fulfilled, (state, action) => {
        if (!action.payload.removed) return;
        const { id } = action.payload;
        state.consumers = state.consumers.filter(
          (consumer) => consumer.id !== id,
        );
        Object.values(state.meals).forEach((month) => {
          delete month[id];
        });
        Object.values(state.deposits).forEach((month) => {
          delete month[id];
        });
      })
      .addCase(setMeal.pending, (state, action) => {
        const { yearMonth, consumerId, day, count } = action.meta.arg;
        state.meals[yearMonth] ??= {};
        state.meals[yearMonth][consumerId] ??= {};
        state.meals[yearMonth][consumerId][day.toString()] = count;
      })
      .addCase(setExpense.fulfilled, (state, action) => {
        const { yearMonth, day, items } = action.payload;
        state.expenses[yearMonth] ??= {};
        state.expenses[yearMonth][day.toString()] = { items };
      })
      .addCase(setDeposit.pending, (state, action) => {
        const { yearMonth, consumerId, day, amount } = action.meta.arg;
        state.deposits[yearMonth] ??= {};
        state.deposits[yearMonth][consumerId] ??= {};
        state.deposits[yearMonth][consumerId][day.toString()] = amount;
      })
      .addMatcher(isPending(...messAsyncThunks), (state) => {
        state.requestStatus = "loading";
        state.requestError = null;
      })
      .addMatcher(isFulfilled(...messAsyncThunks), (state) => {
        state.requestStatus = "succeeded";
        state.requestError = null;
      })
      .addMatcher(isRejected(...messAsyncThunks), (state, action) => {
        state.requestStatus = "failed";
        state.requestError = action.error.message ?? "Request failed";
      });
  },
});

export const formatYearMonth = (year: number, month: number): string =>
  `${year}-${month.toString().padStart(2, "0")}`;

export const getDaysInMonth = (yearMonth: string): number => {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
};

export const selectMessState = (state: MessRootState) => state.mess;

export default messSlice.reducer;
