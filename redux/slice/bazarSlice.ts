import {
  createAction,
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import {
  api,
  type ApiBazarAssignment,
  type ApiBazarItem,
  type ApiConsumer,
} from "@/lib/api";
import { loadBazarFromCache, saveBazarToCache } from "@/lib/cache";
import {
  getOfflineDatabase,
  isOfflineDatabaseSupported,
} from "@/offline/database/connection";
import { BazarRepository } from "@/offline/features/bazar/BazarRepository";
import { getLocalConsumers } from "@/offline/features/reference/storage";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";
import type { NetworkState } from "@/redux/slice/networkSlice";

export interface BazarState {
  items: ApiBazarItem[];
  assignments: ApiBazarAssignment[];
  consumers: ApiConsumer[];
  scopeMessId: number | null;
  loadStatus: "idle" | "loading" | "succeeded" | "failed";
  mutationStatus: "idle" | "loading" | "succeeded" | "failed";
  dataSource: "none" | "local" | "live";
  pendingCount: number;
  lastSyncedAt: number | null;
  error: string | null;
}

type BazarRootState = {
  auth: AuthState;
  bazar: BazarState;
  network: NetworkState;
};

interface BazarPayload {
  messId: number;
  items: ApiBazarItem[];
  assignments: ApiBazarAssignment[];
  consumers: ApiConsumer[];
  dataSource: BazarState["dataSource"];
  pendingCount: number;
  lastSyncedAt: number | null;
  syncError?: string | null;
}

interface MutationResult {
  messId: number;
  queued: boolean;
}

const createInitialState = (scopeMessId: number | null = null): BazarState => ({
  items: [],
  assignments: [],
  consumers: [],
  scopeMessId,
  loadStatus: "idle",
  mutationStatus: "idle",
  dataSource: "none",
  pendingCount: 0,
  lastSyncedAt: null,
  error: null,
});

const getAuthContext = (state: BazarRootState) => {
  const { token, activeMess, user } = state.auth;
  if (!token || !activeMess || !user) {
    throw new Error("Please select a mess and sign in again.");
  }
  return {
    token,
    userId: user.id,
    messId: activeMess.id,
    isAdmin: activeMess.role === "admin",
  };
};

const bazarSnapshotReceived = createAction<BazarPayload>(
  "bazar/snapshotReceived",
);

const readNativePayload = async (
  userId: number,
  messId: number,
  includeConsumers: boolean,
  dataSource: BazarState["dataSource"],
  syncError: string | null = null,
): Promise<BazarPayload> => {
  const database = await getOfflineDatabase();
  const [snapshot, consumerSnapshot] = await Promise.all([
    new BazarRepository(database).getSnapshot(userId, messId),
    includeConsumers
      ? getLocalConsumers(userId, messId)
      : Promise.resolve(null),
  ]);
  return {
    messId,
    items: snapshot?.items ?? [],
    assignments: snapshot?.assignments ?? [],
    consumers: consumerSnapshot?.consumers ?? [],
    dataSource: snapshot ? dataSource : "none",
    pendingCount: snapshot?.pendingCount ?? 0,
    lastSyncedAt: snapshot?.savedAt || null,
    syncError,
  };
};

const syncNativeBazar = async (
  userId: number,
  messId: number,
  token: string,
) => {
  const database = await getOfflineDatabase();
  return getOfflineRuntime(database).engine.sync({ userId, messId, token });
};

const applySnapshot = (state: BazarState, payload: BazarPayload) => {
  if (state.scopeMessId !== null && state.scopeMessId !== payload.messId)
    return;
  state.scopeMessId = payload.messId;
  state.items = payload.items;
  state.assignments = payload.assignments;
  state.consumers = payload.consumers;
  state.dataSource = payload.dataSource;
  state.pendingCount = payload.pendingCount;
  state.lastSyncedAt = payload.lastSyncedAt;
  state.error = payload.syncError ?? null;
};

const publishNativeSnapshot = async (
  dispatch: (action: ReturnType<typeof bazarSnapshotReceived>) => unknown,
  context: ReturnType<typeof getAuthContext>,
  source: BazarState["dataSource"],
  syncError: string | null = null,
) => {
  const payload = await readNativePayload(
    context.userId,
    context.messId,
    context.isAdmin,
    source,
    syncError,
  );
  dispatch(bazarSnapshotReceived(payload));
  return payload;
};

const finishNativeMutation = async (
  dispatch: (action: ReturnType<typeof bazarSnapshotReceived>) => unknown,
  getState: () => BazarRootState,
  context: ReturnType<typeof getAuthContext>,
): Promise<MutationResult> => {
  await publishNativeSnapshot(dispatch, context, "local");
  if (!getState().network.isOnline) {
    return { messId: context.messId, queued: true };
  }
  const summary = await syncNativeBazar(
    context.userId,
    context.messId,
    context.token,
  );
  const syncError =
    summary.failed > 0 ? "Some bazar changes could not sync yet." : null;
  const payload = await publishNativeSnapshot(
    dispatch,
    context,
    syncError ? "local" : "live",
    syncError,
  );
  return { messId: context.messId, queued: payload.pendingCount > 0 };
};

export const loadBazar = createAsyncThunk<
  BazarPayload,
  { includeConsumers: boolean },
  { state: BazarRootState }
>("bazar/load", async ({ includeConsumers }, { dispatch, getState }) => {
  const context = getAuthContext(getState());

  if (!isOfflineDatabaseSupported()) {
    const cached = await loadBazarFromCache(context.messId);
    if (!getState().network.isOnline) {
      return {
        messId: context.messId,
        items: cached?.items ?? [],
        assignments: cached?.assignments ?? [],
        consumers: cached?.consumers ?? [],
        dataSource: cached ? "local" : "none",
        pendingCount: 0,
        lastSyncedAt: null,
      };
    }
    try {
      const [bazar, members] = await Promise.all([
        api.getBazar(context.token, context.messId),
        includeConsumers
          ? api.getMessConsumers(context.token, context.messId)
          : Promise.resolve({ consumers: [] }),
      ]);
      const data = {
        items: bazar.items,
        assignments: bazar.assignments,
        consumers: members.consumers,
      };
      await saveBazarToCache(context.messId, data);
      return {
        messId: context.messId,
        ...data,
        dataSource: "live",
        pendingCount: 0,
        lastSyncedAt: Date.now(),
      };
    } catch (error) {
      if (!cached) throw error;
      return {
        messId: context.messId,
        ...cached,
        dataSource: "local",
        pendingCount: 0,
        lastSyncedAt: null,
        syncError: error instanceof Error ? error.message : "Refresh failed.",
      };
    }
  }

  const local = await readNativePayload(
    context.userId,
    context.messId,
    includeConsumers,
    "local",
  );
  dispatch(bazarSnapshotReceived(local));
  if (!getState().network.isOnline) return local;

  const summary = await syncNativeBazar(
    context.userId,
    context.messId,
    context.token,
  );
  const syncError =
    summary.failed > 0 ? "Bazar refresh failed. Cached data is shown." : null;
  return readNativePayload(
    context.userId,
    context.messId,
    includeConsumers,
    syncError ? "local" : "live",
    syncError,
  );
});

export const createBazarItem = createAsyncThunk<
  MutationResult,
  { weekday: number; name: string; price: number },
  { state: BazarRootState }
>("bazar/createItem", async (input, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    await api.createBazarItem(
      input.weekday,
      input.name,
      input.price,
      context.token,
      context.messId,
    );
    await dispatch(loadBazar({ includeConsumers: context.isAdmin })).unwrap();
    return { messId: context.messId, queued: false };
  }
  const repository = new BazarRepository(await getOfflineDatabase());
  await repository.createItem(context.userId, context.messId, input);
  return finishNativeMutation(dispatch, getState, context);
});

export const updateBazarItem = createAsyncThunk<
  MutationResult,
  { id: number; name: string; price: number },
  { state: BazarRootState }
>("bazar/updateItem", async (input, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    await api.updateBazarItem(
      input.id,
      input.name,
      input.price,
      context.token,
      context.messId,
    );
    await dispatch(loadBazar({ includeConsumers: context.isAdmin })).unwrap();
    return { messId: context.messId, queued: false };
  }
  const repository = new BazarRepository(await getOfflineDatabase());
  await repository.updateItem(context.userId, context.messId, input.id, input);
  return finishNativeMutation(dispatch, getState, context);
});

export const updateBazarItemStatus = createAsyncThunk<
  MutationResult,
  { id: number; completed: boolean },
  { state: BazarRootState }
>("bazar/updateItemStatus", async (input, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    await api.updateBazarItemStatus(
      input.id,
      input.completed,
      context.token,
      context.messId,
    );
    await dispatch(loadBazar({ includeConsumers: context.isAdmin })).unwrap();
    return { messId: context.messId, queued: false };
  }
  const repository = new BazarRepository(await getOfflineDatabase());
  await repository.updateItemStatus(
    context.userId,
    context.messId,
    input.id,
    input.completed,
  );
  return finishNativeMutation(dispatch, getState, context);
});

export const deleteBazarItem = createAsyncThunk<
  MutationResult,
  number,
  { state: BazarRootState }
>("bazar/deleteItem", async (id, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    await api.deleteBazarItem(id, context.token, context.messId);
    await dispatch(loadBazar({ includeConsumers: context.isAdmin })).unwrap();
    return { messId: context.messId, queued: false };
  }
  const repository = new BazarRepository(await getOfflineDatabase());
  await repository.deleteItem(context.userId, context.messId, id);
  return finishNativeMutation(dispatch, getState, context);
});

export const deleteBazarItems = createAsyncThunk<
  MutationResult,
  number,
  { state: BazarRootState }
>("bazar/deleteItems", async (weekday, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    await api.deleteBazarItems(weekday, context.token, context.messId);
    await dispatch(loadBazar({ includeConsumers: context.isAdmin })).unwrap();
    return { messId: context.messId, queued: false };
  }
  const repository = new BazarRepository(await getOfflineDatabase());
  await repository.deleteWeekday(context.userId, context.messId, weekday);
  return finishNativeMutation(dispatch, getState, context);
});

export const assignBazarMembers = createAsyncThunk<
  MutationResult,
  { weekday: number; consumerIds: number[] },
  { state: BazarRootState }
>("bazar/assignMembers", async (input, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    await api.assignBazarMembers(
      input.weekday,
      input.consumerIds,
      context.token,
      context.messId,
    );
    await dispatch(loadBazar({ includeConsumers: context.isAdmin })).unwrap();
    return { messId: context.messId, queued: false };
  }
  const repository = new BazarRepository(await getOfflineDatabase());
  await repository.setAssignments(context.userId, context.messId, {
    ...input,
    consumers: getState().bazar.consumers,
  });
  return finishNativeMutation(dispatch, getState, context);
});

export const notifyBazarMembers = createAsyncThunk<
  MutationResult,
  { weekday: number },
  { state: BazarRootState }
>("bazar/notifyMembers", async ({ weekday }, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline notifications require the mobile app.");
    await api.notifyAssignedBazarMembers(
      weekday,
      context.token,
      context.messId,
    );
    return { messId: context.messId, queued: false };
  }
  const repository = new BazarRepository(await getOfflineDatabase());
  await repository.enqueueNotifyMembers(
    context.userId,
    context.messId,
    weekday,
  );
  return finishNativeMutation(dispatch, getState, context);
});

const bazarSlice = createSlice({
  name: "bazar",
  initialState: createInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(syncMessScope, (state, action) => {
        if (state.scopeMessId === action.payload) return;
        return createInitialState(action.payload);
      })
      .addCase(bazarSnapshotReceived, (state, action) => {
        applySnapshot(state, action.payload);
        state.loadStatus = "succeeded";
      })
      .addCase(loadBazar.pending, (state) => {
        state.loadStatus = "loading";
        state.error = null;
      })
      .addCase(loadBazar.fulfilled, (state, action) => {
        applySnapshot(state, action.payload);
        state.loadStatus = "succeeded";
      })
      .addCase(loadBazar.rejected, (state, action) => {
        state.loadStatus = "failed";
        state.error = action.error.message ?? "Could not load bazar list";
      })
      .addMatcher(
        (action) =>
          action.type.startsWith("bazar/") &&
          action.type.endsWith("/pending") &&
          action.type !== loadBazar.pending.type,
        (state) => {
          state.mutationStatus = "loading";
          state.error = null;
        },
      )
      .addMatcher(
        (action): action is PayloadAction<MutationResult> =>
          action.type.startsWith("bazar/") &&
          action.type.endsWith("/fulfilled") &&
          action.type !== loadBazar.fulfilled.type,
        (state) => {
          state.mutationStatus = "succeeded";
        },
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("bazar/") &&
          action.type.endsWith("/rejected") &&
          action.type !== loadBazar.rejected.type,
        (state, action) => {
          state.mutationStatus = "failed";
          state.error =
            "error" in action &&
            typeof action.error === "object" &&
            action.error &&
            "message" in action.error
              ? String(action.error.message)
              : "Bazar request failed";
        },
      );
  },
});

export const selectBazarState = (state: BazarRootState) => state.bazar;
export default bazarSlice.reducer;
