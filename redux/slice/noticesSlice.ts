import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, clearApiCache, type ApiNotice } from "@/lib/api";
import { loadNoticesFromCache, saveNoticesToCache } from "@/lib/cache";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";
import type { NetworkState } from "@/redux/slice/networkSlice";

export interface NoticesState {
  notices: ApiNotice[];
  scopeMessId: number | null;
  loadStatus: "idle" | "loading" | "succeeded" | "failed";
  mutationStatus: "idle" | "loading" | "succeeded" | "failed";
  reorderStatus: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

type NoticesRootState = {
  auth: AuthState;
  network: NetworkState;
  notices: NoticesState;
};

const createInitialState = (
  scopeMessId: number | null = null,
): NoticesState => ({
  notices: [],
  scopeMessId,
  loadStatus: "idle",
  mutationStatus: "idle",
  reorderStatus: "idle",
  error: null,
});

const getAuthContext = (state: NoticesRootState) => {
  const { token, activeMess } = state.auth;
  if (!token || !activeMess)
    throw new Error("Please select a mess and sign in again.");
  return { token, messId: activeMess.id };
};

const noticesCacheReceived = createAction<{
  messId: number;
  notices: ApiNotice[];
}>("notices/cacheReceived");

interface LoadNoticesArgs {
  force?: boolean;
}

export const loadNotices = createAsyncThunk<
  { messId: number; notices: ApiNotice[] },
  LoadNoticesArgs,
  { state: NoticesRootState }
>("notices/load", async ({ force = false }, { dispatch, getState }) => {
  const { token, messId } = getAuthContext(getState());
  const cached = await loadNoticesFromCache(messId);
  if (cached) dispatch(noticesCacheReceived({ messId, notices: cached }));

  if (!getState().network.isOnline) {
    if (cached) return { messId, notices: cached };
    throw new Error(
      "No internet connection and no cached notices are available.",
    );
  }

  clearApiCache();
  try {
    const response = await api.getNotices(token, messId);
    await saveNoticesToCache(messId, response.notices);
    return { messId, notices: response.notices };
  } catch (error) {
    if (cached && !force) return { messId, notices: cached };
    throw error;
  }
});

export const createNotice = createAsyncThunk<
  { messId: number; notices: ApiNotice[] },
  { title: string; body: string; color: string },
  { state: NoticesRootState }
>("notices/create", async (input, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  if (!getState().network.isOnline)
    throw new Error("Internet connection required.");
  await api.createNotice(input.title, input.body, input.color, token, messId);
  const response = await api.getNotices(token, messId);
  await saveNoticesToCache(messId, response.notices);
  return { messId, notices: response.notices };
});

export const updateNotice = createAsyncThunk<
  { messId: number; notice: ApiNotice },
  { id: number; title: string; body: string; color: string },
  { state: NoticesRootState }
>("notices/update", async (input, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  if (!getState().network.isOnline)
    throw new Error("Internet connection required.");
  const response = await api.updateNotice(
    input.id,
    input.title,
    input.body,
    input.color,
    token,
    messId,
  );
  const notices = getState().notices.notices.map((notice) =>
    notice.id === response.notice.id ? response.notice : notice,
  );
  await saveNoticesToCache(messId, notices);
  return { messId, notice: response.notice };
});

export const deleteNotice = createAsyncThunk<
  { messId: number; id: number },
  number,
  { state: NoticesRootState }
>("notices/delete", async (id, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  if (!getState().network.isOnline)
    throw new Error("Internet connection required.");
  await api.deleteNotice(id, token, messId);
  const notices = getState().notices.notices.filter(
    (notice) => notice.id !== id,
  );
  await saveNoticesToCache(messId, notices);
  return { messId, id };
});

export const reorderNotices = createAsyncThunk<
  { messId: number; notices: ApiNotice[] },
  number[],
  { state: NoticesRootState }
>("notices/reorder", async (noticeIds, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  if (!getState().network.isOnline)
    throw new Error("Internet connection required.");
  const response = await api.reorderNotices(noticeIds, token, messId);
  await saveNoticesToCache(messId, response.notices);
  return { messId, notices: response.notices };
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
      .addCase(noticesCacheReceived, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.notices = action.payload.notices;
        state.loadStatus = "succeeded";
        state.error = null;
      })
      .addCase(loadNotices.pending, (state) => {
        state.loadStatus = "loading";
        state.error = null;
      })
      .addCase(loadNotices.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.notices = action.payload.notices;
        state.loadStatus = "succeeded";
      })
      .addCase(loadNotices.rejected, (state, action) => {
        state.loadStatus = "failed";
        state.error = action.error.message ?? "Could not load notices";
      })
      .addCase(createNotice.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(createNotice.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.notices = action.payload.notices;
        state.mutationStatus = "succeeded";
      })
      .addCase(updateNotice.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.notices = state.notices.map((notice) =>
          notice.id === action.payload.notice.id
            ? action.payload.notice
            : notice,
        );
        state.mutationStatus = "succeeded";
      })
      .addCase(deleteNotice.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.notices = state.notices.filter(
          (notice) => notice.id !== action.payload.id,
        );
        state.mutationStatus = "succeeded";
      })
      .addCase(createNotice.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.error.message ?? "Could not save notice";
      })
      .addCase(updateNotice.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.error.message ?? "Could not save notice";
      })
      .addCase(deleteNotice.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = action.error.message ?? "Could not save notice";
      })
      .addCase(reorderNotices.pending, (state) => {
        state.reorderStatus = "loading";
        state.error = null;
      })
      .addCase(reorderNotices.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.notices = action.payload.notices;
        state.reorderStatus = "succeeded";
      })
      .addCase(reorderNotices.rejected, (state, action) => {
        state.reorderStatus = "failed";
        state.error = action.error.message ?? "Could not reorder notices";
      });
  },
});

export const selectNoticesState = (state: NoticesRootState) => state.notices;
export const { setNoticeOrder } = noticesSlice.actions;

export default noticesSlice.reducer;
