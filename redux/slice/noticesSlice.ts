import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type ApiNotice } from "@/lib/api";
import { loadNoticesFromCache, saveNoticesToCache } from "@/lib/cache";
import {
  getOfflineDatabase,
  isOfflineDatabaseSupported,
} from "@/offline/database/connection";
import { NoticeRepository } from "@/offline/features/notices/NoticeRepository";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";
import type { NetworkState } from "@/redux/slice/networkSlice";

export interface NoticesState {
  notices: ApiNotice[];
  unreadCount: number;
  scopeMessId: number | null;
  loadStatus: "idle" | "loading" | "succeeded" | "failed";
  mutationStatus: "idle" | "loading" | "succeeded" | "failed";
  reorderStatus: "idle" | "loading" | "succeeded" | "failed";
  dataSource: "none" | "local" | "live";
  pendingCount: number;
  lastSyncedAt: number | null;
  error: string | null;
}

type NoticesRootState = {
  auth: AuthState;
  network: NetworkState;
  notices: NoticesState;
};

interface NoticePayload {
  messId: number;
  notices: ApiNotice[];
  unreadCount: number;
  dataSource: NoticesState["dataSource"];
  pendingCount: number;
  lastSyncedAt: number | null;
  syncError?: string | null;
}

interface MutationResult {
  messId: number;
  queued: boolean;
}

const createInitialState = (
  scopeMessId: number | null = null,
): NoticesState => ({
  notices: [],
  unreadCount: 0,
  scopeMessId,
  loadStatus: "idle",
  mutationStatus: "idle",
  reorderStatus: "idle",
  dataSource: "none",
  pendingCount: 0,
  lastSyncedAt: null,
  error: null,
});

const getAuthContext = (state: NoticesRootState) => {
  const { token, activeMess, user } = state.auth;
  if (!token || !activeMess || !user) {
    throw new Error("Please select a mess and sign in again.");
  }
  return { token, userId: user.id, messId: activeMess.id };
};

const localSnapshotReceived = createAction<NoticePayload>(
  "notices/localSnapshotReceived",
);

const readNativePayload = async (
  userId: number,
  messId: number,
  dataSource: NoticesState["dataSource"],
  syncError: string | null = null,
): Promise<NoticePayload> => {
  const snapshot = await new NoticeRepository(
    await getOfflineDatabase(),
  ).getSnapshot(userId, messId);
  return {
    messId,
    notices: snapshot?.notices ?? [],
    unreadCount: snapshot?.unreadCount ?? 0,
    dataSource: snapshot ? dataSource : "none",
    pendingCount: snapshot?.pendingCount ?? 0,
    lastSyncedAt: snapshot?.savedAt || null,
    syncError,
  };
};

const syncNativeNotices = async (
  userId: number,
  messId: number,
  token: string,
  force = false,
) =>
  getOfflineRuntime(await getOfflineDatabase()).engine.sync(
    { userId, messId, token },
    { collections: ["notices"], force },
  );

const publishNativeSnapshot = async (
  dispatch: (action: ReturnType<typeof localSnapshotReceived>) => unknown,
  context: ReturnType<typeof getAuthContext>,
  source: NoticesState["dataSource"],
  syncError: string | null = null,
) => {
  const payload = await readNativePayload(
    context.userId,
    context.messId,
    source,
    syncError,
  );
  dispatch(localSnapshotReceived(payload));
  return payload;
};

const finishNativeMutation = async (
  dispatch: (action: ReturnType<typeof localSnapshotReceived>) => unknown,
  getState: () => NoticesRootState,
  context: ReturnType<typeof getAuthContext>,
): Promise<MutationResult> => {
  await publishNativeSnapshot(dispatch, context, "local");
  if (!getState().network.isOnline)
    return { messId: context.messId, queued: true };
  const summary = await syncNativeNotices(
    context.userId,
    context.messId,
    context.token,
    true,
  );
  const syncError =
    summary.failed > 0 ? "Some notice changes could not sync yet." : null;
  const payload = await publishNativeSnapshot(
    dispatch,
    context,
    syncError ? "local" : "live",
    syncError,
  );
  return { messId: context.messId, queued: payload.pendingCount > 0 };
};

export const loadNotices = createAsyncThunk<
  NoticePayload,
  { force?: boolean },
  { state: NoticesRootState }
>("notices/load", async ({ force = false }, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    const cached = await loadNoticesFromCache(context.messId);
    if (!getState().network.isOnline) {
      return {
        messId: context.messId,
        notices: cached ?? [],
        unreadCount: 0,
        dataSource: cached ? "local" : "none",
        pendingCount: 0,
        lastSyncedAt: null,
      };
    }
    try {
      const response = await api.getNotices(context.token, context.messId);
      await saveNoticesToCache(context.messId, response.notices);
      return {
        messId: context.messId,
        notices: response.notices,
        unreadCount: 0,
        dataSource: "live",
        pendingCount: 0,
        lastSyncedAt: Date.now(),
      };
    } catch (error) {
      if (!cached || force) throw error;
      return {
        messId: context.messId,
        notices: cached,
        unreadCount: 0,
        dataSource: "local",
        pendingCount: 0,
        lastSyncedAt: null,
        syncError: error instanceof Error ? error.message : "Refresh failed.",
      };
    }
  }

  const database = await getOfflineDatabase();
  const repository = new NoticeRepository(database);
  let local = await repository.getSnapshot(context.userId, context.messId);
  if (!local) {
    // Preserve the pre-SQLite notice cache for upgrades while offline.
    const legacy = await loadNoticesFromCache(context.messId);
    if (legacy) {
      await repository.replaceRemoteSnapshot(
        context.userId,
        context.messId,
        legacy,
        0,
      );
      local = await repository.getSnapshot(context.userId, context.messId);
    }
  }
  const localPayload: NoticePayload = {
    messId: context.messId,
    notices: local?.notices ?? [],
    unreadCount: local?.unreadCount ?? 0,
    dataSource: local ? "local" : "none",
    pendingCount: local?.pendingCount ?? 0,
    lastSyncedAt: local?.savedAt || null,
  };
  dispatch(localSnapshotReceived(localPayload));
  if (!getState().network.isOnline) return localPayload;
  const summary = await syncNativeNotices(
    context.userId,
    context.messId,
    context.token,
  );
  const syncError =
    summary.failed > 0 ? "Refresh failed. Cached notices are shown." : null;
  return readNativePayload(
    context.userId,
    context.messId,
    syncError ? "local" : "live",
    syncError,
  );
});

export const loadUnreadNoticesCount = createAsyncThunk<
  { messId: number; unreadCount: number },
  void,
  { state: NoticesRootState }
>("notices/loadUnreadCount", async (_arg, { getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      return { messId: context.messId, unreadCount: 0 };
    const response = await api.getUnreadNoticesCount(
      context.token,
      context.messId,
    );
    return { messId: context.messId, unreadCount: response.unreadCount };
  }
  const repository = new NoticeRepository(await getOfflineDatabase());
  const local = await repository.getUnreadCount(context.userId, context.messId);
  if (!getState().network.isOnline)
    return { messId: context.messId, unreadCount: local };
  const response = await api.getUnreadNoticesCount(
    context.token,
    context.messId,
  );
  const unreadCount = await repository.replaceRemoteUnreadCount(
    context.userId,
    context.messId,
    response.unreadCount,
  );
  return { messId: context.messId, unreadCount };
});

export const markNoticesRead = createAsyncThunk<
  { messId: number },
  void,
  { state: NoticesRootState }
>("notices/markRead", async (_arg, { getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (getState().network.isOnline)
      await api.markNoticesRead(context.token, context.messId);
    return { messId: context.messId };
  }
  const database = await getOfflineDatabase();
  await new NoticeRepository(database).markRead(context.userId, context.messId);
  if (getState().network.isOnline)
    await getOfflineRuntime(database).engine.sync(context, {
      collections: ["notices"],
      force: true,
    });
  return { messId: context.messId };
});

export const createNotice = createAsyncThunk<
  MutationResult,
  { title: string; body: string; color: string },
  { state: NoticesRootState }
>("notices/create", async (input, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    await api.createNotice(
      input.title,
      input.body,
      input.color,
      context.token,
      context.messId,
    );
    await dispatch(loadNotices({})).unwrap();
    return { messId: context.messId, queued: false };
  }
  await new NoticeRepository(await getOfflineDatabase()).create(
    context.userId,
    context.messId,
    input,
  );
  return finishNativeMutation(dispatch, getState, context);
});

export const updateNotice = createAsyncThunk<
  MutationResult,
  { id: number; title: string; body: string; color: string },
  { state: NoticesRootState }
>("notices/update", async (input, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    await api.updateNotice(
      input.id,
      input.title,
      input.body,
      input.color,
      context.token,
      context.messId,
    );
    await dispatch(loadNotices({})).unwrap();
    return { messId: context.messId, queued: false };
  }
  await new NoticeRepository(await getOfflineDatabase()).update(
    context.userId,
    context.messId,
    input.id,
    input,
  );
  return finishNativeMutation(dispatch, getState, context);
});

export const deleteNotice = createAsyncThunk<
  MutationResult,
  number,
  { state: NoticesRootState }
>("notices/delete", async (id, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    await api.deleteNotice(id, context.token, context.messId);
    await dispatch(loadNotices({})).unwrap();
    return { messId: context.messId, queued: false };
  }
  await new NoticeRepository(await getOfflineDatabase()).remove(
    context.userId,
    context.messId,
    id,
  );
  return finishNativeMutation(dispatch, getState, context);
});

export const reorderNotices = createAsyncThunk<
  MutationResult,
  ApiNotice[],
  { state: NoticesRootState }
>("notices/reorder", async (notices, { dispatch, getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (!getState().network.isOnline)
      throw new Error("Offline editing requires the mobile app.");
    const response = await api.reorderNotices(
      notices.map((notice) => notice.id),
      context.token,
      context.messId,
    );
    await saveNoticesToCache(context.messId, response.notices);
    return { messId: context.messId, queued: false };
  }
  await new NoticeRepository(await getOfflineDatabase()).reorder(
    context.userId,
    context.messId,
    notices,
  );
  return finishNativeMutation(dispatch, getState, context);
});

const noticesSlice = createSlice({
  name: "notices",
  initialState: createInitialState(),
  reducers: {
    setNoticeOrder: (state, action: { payload: ApiNotice[] }) => {
      state.notices = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncMessScope, (state, action) => {
        if (state.scopeMessId === action.payload) return;
        return createInitialState(action.payload);
      })
      .addCase(localSnapshotReceived, (state, action) => {
        if (
          state.scopeMessId !== null &&
          state.scopeMessId !== action.payload.messId
        )
          return;
        state.scopeMessId = action.payload.messId;
        state.notices = action.payload.notices;
        state.unreadCount = action.payload.unreadCount;
        state.dataSource = action.payload.dataSource;
        state.pendingCount = action.payload.pendingCount;
        state.lastSyncedAt = action.payload.lastSyncedAt;
        state.error = action.payload.syncError ?? null;
        state.loadStatus = "succeeded";
      })
      .addCase(loadNotices.pending, (state) => {
        state.loadStatus = "loading";
        state.error = null;
      })
      .addCase(loadNotices.fulfilled, (state, action) => {
        if (
          state.scopeMessId !== null &&
          state.scopeMessId !== action.payload.messId
        )
          return;
        state.scopeMessId = action.payload.messId;
        state.notices = action.payload.notices;
        state.unreadCount = action.payload.unreadCount;
        state.dataSource = action.payload.dataSource;
        state.pendingCount = action.payload.pendingCount;
        state.lastSyncedAt = action.payload.lastSyncedAt;
        state.error = action.payload.syncError ?? null;
        state.loadStatus = "succeeded";
      })
      .addCase(loadNotices.rejected, (state, action) => {
        state.loadStatus = "failed";
        state.error = action.error.message ?? "Could not load notices";
      })
      .addCase(loadUnreadNoticesCount.fulfilled, (state, action) => {
        if (
          state.scopeMessId !== null &&
          state.scopeMessId !== action.payload.messId
        )
          return;
        state.scopeMessId = action.payload.messId;
        state.unreadCount = Math.max(0, action.payload.unreadCount);
      })
      .addCase(markNoticesRead.pending, (state) => {
        state.unreadCount = 0;
      })
      .addCase(markNoticesRead.fulfilled, (state, action) => {
        if (
          state.scopeMessId === null ||
          state.scopeMessId === action.payload.messId
        )
          state.unreadCount = 0;
      })
      .addCase(reorderNotices.pending, (state) => {
        state.reorderStatus = "loading";
        state.error = null;
      })
      .addMatcher(
        (action) =>
          action.type.startsWith("notices/") &&
          action.type.endsWith("/pending") &&
          action.type !== loadNotices.pending.type &&
          action.type !== markNoticesRead.pending.type &&
          action.type !== reorderNotices.pending.type,
        (state) => {
          state.mutationStatus = "loading";
          state.error = null;
        },
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("notices/") &&
          action.type.endsWith("/fulfilled") &&
          action.type !== loadNotices.fulfilled.type &&
          action.type !== markNoticesRead.fulfilled.type &&
          action.type !== loadUnreadNoticesCount.fulfilled.type,
        (state, action) => {
          state.mutationStatus = "succeeded";
          if (action.type === reorderNotices.fulfilled.type)
            state.reorderStatus = "succeeded";
        },
      )
      .addMatcher(
        (action): action is { type: string; error: { message?: string } } =>
          action.type.startsWith("notices/") &&
          action.type.endsWith("/rejected") &&
          "error" in action,
        (state, action) => {
          if (action.type === reorderNotices.rejected.type)
            state.reorderStatus = "failed";
          else if (action.type !== loadNotices.rejected.type)
            state.mutationStatus = "failed";
          state.error = action.error?.message ?? "Notice request failed";
        },
      );
  },
});

export const selectNoticesState = (state: NoticesRootState) => state.notices;
export const { setNoticeOrder } = noticesSlice.actions;
export default noticesSlice.reducer;
