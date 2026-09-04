import {
  createAction,
  createAsyncThunk,
  createSlice,
  isFulfilled,
  isPending,
  isRejected,
  unwrapResult,
} from "@reduxjs/toolkit";

import {
  api,
  clearApiCache,
  type ApiConsumer,
  type MonthData,
} from "@/lib/api";
import { loadFromCache, saveToCache } from "@/lib/cache";
import {
  getLocalConsumers,
  saveLocalConsumers,
} from "@/offline/features/reference/storage";
import { updateProfileName, type AuthState } from "@/redux/slice/authSlice";
import { getOfflineDatabase } from "@/offline/database/connection";
import { DailyMealsRepository } from "@/offline/features/dailyMeals/DailyMealsRepository";
import type { NetworkState } from "@/redux/slice/networkSlice";
import type { Consumer } from "@/types/mess";

export interface MessState {
  consumers: Consumer[];
  currentYear: number;
  currentMonth: number;
  scopeMessId: number | null;
  loadedMonths: Record<string, true>;
  loadingMonths: Record<string, true>;
  dataLoading: boolean;
  requestStatus: "idle" | "loading" | "succeeded" | "failed";
  requestError: string | null;
  dataSource: "none" | "cache" | "live";
  consumerDataSource: "none" | "local" | "live";
  consumersLastSyncAt: number | null;
  lastLiveSyncAt: number | null;
  lastRefreshError: string | null;
  lastManualRefreshAt: number | null;
}

type MessRootState = {
  auth: AuthState;
  mess: MessState;
  network: NetworkState;
};

const now = new Date();

const createInitialState = (
  currentYear = now.getFullYear(),
  currentMonth = now.getMonth() + 1,
  scopeMessId: number | null = null,
): MessState => ({
  consumers: [],
  currentYear,
  currentMonth,
  scopeMessId,
  loadedMonths: {},
  loadingMonths: {},
  dataLoading: false,
  requestStatus: "idle",
  requestError: null,
  dataSource: "none",
  consumerDataSource: "none",
  consumersLastSyncAt: null,
  lastLiveSyncAt: null,
  lastRefreshError: null,
  lastManualRefreshAt: null,
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

export const monthDataReceived = createAction<{
  messId: number;
  yearMonth: string;
  data: MonthData;
}>("mess/monthDataReceived");

export const localConsumersReceived = createAction<{
  messId: number;
  consumers: Consumer[];
  savedAt: number;
}>("mess/localConsumersReceived");

const toConsumers = (consumers: ApiConsumer[]): Consumer[] =>
  consumers.map((consumer) => ({
    id: consumer.id.toString(),
    name: consumer.name,
    userId: consumer.userId,
    email: consumer.email,
    mobileNumber: consumer.mobileNumber,
    isAdmin: consumer.isAdmin,
    accountDeletedAt: consumer.accountDeletedAt,
  }));

const createMessAsyncThunk = createAsyncThunk.withTypes<{
  state: MessRootState;
}>();

export const hydrateConsumersFromLocal = createMessAsyncThunk<void, void>(
  "mess/hydrateConsumersFromLocal",
  async (_arg, { dispatch, getState }) => {
    const { user, activeMess } = getState().auth;
    if (!user || !activeMess) return;
    const cached = await getLocalConsumers(user.id, activeMess.id);
    if (!cached) return;
    dispatch(
      localConsumersReceived({
        messId: activeMess.id,
        consumers: toConsumers(cached.consumers),
        savedAt: cached.savedAt,
      }),
    );
  },
);

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
    const { token, user, activeMess } = getState().auth;
    if (!token || !user || activeMess?.id !== messId) {
      return { messId, yearMonth, force, data: null };
    }

    const key = monthKey(messId, yearMonth);
    const alreadyLoaded = Boolean(getState().mess.loadedMonths[key]);

    // A persisted snapshot keeps the primary month-based screens usable in
    // airplane mode. Never wait for the fetch timeout when NetInfo already
    // knows the device is offline.
    if (!alreadyLoaded && !force) {
      const cached = await loadFromCache(messId, yearMonth);
      if (cached) {
        const cachedMonth = cached as MonthData;
        try {
          const repository = new DailyMealsRepository(await getOfflineDatabase());
          const beforeSeed = await repository.getMonth(user.id, messId, yearMonth);
          if (Object.keys(beforeSeed).length === 0) {
            await repository.mergeRemote(user.id, messId, yearMonth, cachedMonth.meals);
          }
          const localMeals = await repository.getMonth(user.id, messId, yearMonth);
          if (Object.keys(localMeals).length > 0) cachedMonth.meals = localMeals;
        } catch {
          // SQLite is native-only; preserve the legacy cache on web.
        }
        await saveLocalConsumers(user.id, messId, cachedMonth.consumers).catch(
          () => undefined,
        );
        dispatch(
          monthDataReceived({
            messId,
            yearMonth,
            data: cachedMonth,
          }),
        );
      }
    }

    if (!getState().network.isOnline) {
      if (!alreadyLoaded && !getState().mess.loadedMonths[key]) {
        throw new Error(
          "No internet connection and no cached data is available.",
        );
      }
      return { messId, yearMonth, force, data: null };
    }

    const data = await api.getMonthData(yearMonth, token, messId);
    if (data) {
      try {
        data.meals = await new DailyMealsRepository(await getOfflineDatabase()).mergeRemote(user.id, messId, yearMonth, data.meals);
      } catch {
        // Web and pre-migration builds retain the existing cache path.
      }
      await Promise.all([
        saveToCache(messId, yearMonth, data),
        saveLocalConsumers(user.id, messId, data.consumers),
      ]);
    }
    return { messId, yearMonth, force, data };
  },
  {
    condition: ({ messId, yearMonth }, { getState }) => {
      const state = getState();
      if (!state.auth.token || state.auth.activeMess?.id !== messId)
        return false;
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
    const result = await dispatch(
      loadMonth({ messId, yearMonth, force: true }),
    );
    if (loadMonth.rejected.match(result) && result.meta.condition) return;
    unwrapResult(result);
  },
);

export const refreshConsumers = createMessAsyncThunk<
  { messId: number; consumers: Consumer[] } | null,
  void
>("mess/refreshConsumers", async (_arg, { dispatch, getState }) => {
  const { token, user, activeMess } = getState().auth;
  if (!token || !user || !activeMess) return null;
  const cached = await getLocalConsumers(user.id, activeMess.id);
  if (cached) {
    // The reducer receives this before any network request completes, keeping
    // screen rendering independent from connection speed.
    dispatch(
      localConsumersReceived({
        messId: activeMess.id,
        consumers: toConsumers(cached.consumers),
        savedAt: cached.savedAt,
      }),
    );
  }
  if (!getState().network.isOnline) return null;
  clearApiCache();
  const result = await api.getConsumers(token, activeMess.id);
  await saveLocalConsumers(user.id, activeMess.id, result.consumers);
  return {
    messId: activeMess.id,
    consumers: toConsumers(result.consumers),
  };
});

export const addConsumer = createMessAsyncThunk<
  {
    consumer: Consumer | null;
    invitationSent: boolean;
    messId: number;
    consumers: Consumer[];
  },
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
    const { token, user, activeMess } = getState().auth;
    if (!token || !user || !activeMess) {
      throw new Error("Please select a mess and sign in again.");
    }
    const result = await api.addConsumer(
      name,
      email,
      mobileNumber,
      token,
      activeMess.id,
    );
    clearApiCache();
    const latest = await api.getConsumers(token, activeMess.id);
    await saveLocalConsumers(user.id, activeMess.id, latest.consumers);
    return {
      consumer: result.consumer
        ? { id: result.consumer.id.toString(), name: result.consumer.name }
        : null,
      invitationSent: result.invitationSent,
      messId: activeMess.id,
      consumers: toConsumers(latest.consumers),
    };
  },
);

export const removeConsumer = createMessAsyncThunk<
  {
    id: string;
    removed: boolean;
    messId: number | null;
    consumers: Consumer[];
  },
  { id: string; isOnline: boolean }
>("mess/removeConsumer", async ({ id, isOnline }, { getState }) => {
  if (!isOnline) throw new Error("Internet connection required.");
  const { token, user, activeMess } = getState().auth;
  if (!token || !user || !activeMess) {
    return { id, removed: false, messId: null, consumers: [] };
  }
  await api.removeConsumer(parseInt(id, 10), token, activeMess.id);
  clearApiCache();
  const latest = await api.getConsumers(token, activeMess.id);
  await saveLocalConsumers(user.id, activeMess.id, latest.consumers);
  return {
    id,
    removed: true,
    messId: activeMess.id,
    consumers: toConsumers(latest.consumers),
  };
});

const messAsyncThunks = [
  loadMonth,
  refreshMonth,
  addConsumer,
  removeConsumer,
] as const;

const applyMonthData = (
  state: MessState,
  messId: number,
  yearMonth: string,
  data: MonthData,
) => {
  if (state.scopeMessId !== messId) return;
  state.consumers = toConsumers(data.consumers);
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
      .addCase(localConsumersReceived, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.consumers = action.payload.consumers;
        state.consumerDataSource = "local";
        state.consumersLastSyncAt = action.payload.savedAt;
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
          state.dataSource = "cache";
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
        if (data) {
          applyMonthData(state, messId, yearMonth, data);
          if (state.scopeMessId === messId) {
            state.dataSource = "live";
            state.lastLiveSyncAt = Date.now();
            state.lastRefreshError = null;
          }
        }
        if (state.scopeMessId === messId) state.dataLoading = false;
      })
      .addCase(loadMonth.rejected, (state, action) => {
        const { messId, yearMonth } = action.meta.arg;
        delete state.loadingMonths[monthKey(messId, yearMonth)];
        if (state.scopeMessId === messId) {
          state.dataLoading = false;
          state.lastRefreshError =
            action.error.message ?? "Unable to refresh from the server.";
        }
      })
      .addCase(refreshMonth.fulfilled, (state) => {
        state.lastManualRefreshAt = Date.now();
      })
      .addCase(addConsumer.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.consumers = action.payload.consumers;
        state.consumerDataSource = "live";
        state.consumersLastSyncAt = Date.now();
      })
      .addCase(removeConsumer.fulfilled, (state, action) => {
        if (
          !action.payload.removed ||
          state.scopeMessId !== action.payload.messId
        )
          return;
        state.consumers = action.payload.consumers;
        state.consumerDataSource = "live";
        state.consumersLastSyncAt = Date.now();
      })
      .addCase(refreshConsumers.fulfilled, (state, action) => {
        if (!action.payload || state.scopeMessId !== action.payload.messId)
          return;
        state.consumers = action.payload.consumers;
        state.consumerDataSource = "live";
        state.consumersLastSyncAt = Date.now();
      })
      .addCase(updateProfileName.fulfilled, (state, action) => {
        const consumer = state.consumers.find(
          (candidate) =>
            candidate.userId === action.payload.userId ||
            candidate.email?.trim().toLowerCase() ===
              action.payload.email.trim().toLowerCase(),
        );
        if (consumer) consumer.name = action.payload.name;
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
