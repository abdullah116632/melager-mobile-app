import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";

interface ConsumerBreakdownNotificationsState {
  unreadCount: number;
  scopeMessId: number | null;
}

type ConsumerBreakdownNotificationsRootState = {
  auth: AuthState;
  consumerBreakdownNotifications: ConsumerBreakdownNotificationsState;
};

const initialState = (scopeMessId: number | null = null): ConsumerBreakdownNotificationsState => ({ unreadCount: 0, scopeMessId });

const getAuthContext = (state: ConsumerBreakdownNotificationsRootState) => {
  const { token, activeMess } = state.auth;
  if (!token || !activeMess) throw new Error("Please select a mess and sign in again.");
  return { token, messId: activeMess.id };
};

export const loadUnreadConsumerBreakdownCount = createAsyncThunk<{ messId: number; unreadCount: number }, void, { state: ConsumerBreakdownNotificationsRootState }>(
  "consumerBreakdownNotifications/loadUnreadCount",
  async (_arg, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    const response = await api.getUnreadConsumerBreakdownCount(token, messId);
    return { messId, unreadCount: response.unreadCount };
  },
);

export const markConsumerBreakdownNotificationsRead = createAsyncThunk<{ messId: number }, void, { state: ConsumerBreakdownNotificationsRootState }>(
  "consumerBreakdownNotifications/markRead",
  async (_arg, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    await api.markConsumerBreakdownNotificationsRead(token, messId);
    return { messId };
  },
);

const consumerBreakdownNotificationsSlice = createSlice({
  name: "consumerBreakdownNotifications",
  initialState: initialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(syncMessScope, (state, action) => state.scopeMessId === action.payload ? undefined : initialState(action.payload))
      .addCase(loadUnreadConsumerBreakdownCount.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.unreadCount = Math.max(0, action.payload.unreadCount);
      })
      .addCase(markConsumerBreakdownNotificationsRead.pending, (state) => { state.unreadCount = 0; })
      .addCase(markConsumerBreakdownNotificationsRead.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.unreadCount = 0;
      });
  },
});

export const selectConsumerBreakdownNotificationsState = (state: ConsumerBreakdownNotificationsRootState) => state.consumerBreakdownNotifications;
export default consumerBreakdownNotificationsSlice.reducer;
