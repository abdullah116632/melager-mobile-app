import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type ApiNotice } from "@/lib/api";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";

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
  notices: NoticesState;
};

const createInitialState = (scopeMessId: number | null = null): NoticesState => ({
  notices: [],
  scopeMessId,
  loadStatus: "idle",
  mutationStatus: "idle",
  reorderStatus: "idle",
  error: null,
});

const getAuthContext = (state: NoticesRootState) => {
  const { token, activeMess } = state.auth;
  if (!token || !activeMess) throw new Error("Please select a mess and sign in again.");
  return { token, messId: activeMess.id };
};

export const loadNotices = createAsyncThunk<
  { messId: number; notices: ApiNotice[] },
  void,
  { state: NoticesRootState }
>("notices/load", async (_, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.getNotices(token, messId);
  return { messId, notices: response.notices };
});

export const createNotice = createAsyncThunk<
  { messId: number; notice: ApiNotice },
  { title: string; body: string; color: string },
  { state: NoticesRootState }
>("notices/create", async (input, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.createNotice(input.title, input.body, input.color, token, messId);
  return { messId, notice: response.notice };
});

export const updateNotice = createAsyncThunk<
  { messId: number; notice: ApiNotice },
  { id: number; title: string; body: string; color: string },
  { state: NoticesRootState }
>("notices/update", async (input, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.updateNotice(input.id, input.title, input.body, input.color, token, messId);
  return { messId, notice: response.notice };
});

export const deleteNotice = createAsyncThunk<
  { messId: number; id: number },
  number,
  { state: NoticesRootState }
>("notices/delete", async (id, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  await api.deleteNotice(id, token, messId);
  return { messId, id };
});

export const reorderNotices = createAsyncThunk<
  { messId: number; notices: ApiNotice[] },
  number[],
  { state: NoticesRootState }
>("notices/reorder", async (noticeIds, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.reorderNotices(noticeIds, token, messId);
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
        state.notices.push(action.payload.notice);
        state.mutationStatus = "succeeded";
      })
      .addCase(updateNotice.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.notices = state.notices.map((notice) =>
          notice.id === action.payload.notice.id ? action.payload.notice : notice,
        );
        state.mutationStatus = "succeeded";
      })
      .addCase(deleteNotice.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.notices = state.notices.filter((notice) => notice.id !== action.payload.id);
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
