import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";

interface BazarNotificationsState {
  unreadCount: number;
  scopeMessId: number | null;
}

type BazarNotificationsRootState = {
  auth: AuthState;
  bazarNotifications: BazarNotificationsState;
};

const initialState = (scopeMessId: number | null = null): BazarNotificationsState => ({
  unreadCount: 0,
  scopeMessId,
});

const getAuthContext = (state: BazarNotificationsRootState) => {
  const { token, activeMess } = state.auth;
  if (!token || !activeMess) throw new Error("Please select a mess and sign in again.");
  return { token, messId: activeMess.id };
};

export const loadUnreadBazarAssignmentCount = createAsyncThunk<
  { messId: number; unreadCount: number },
  void,
  { state: BazarNotificationsRootState }
>("bazarNotifications/loadUnreadCount", async (_arg, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.getUnreadBazarAssignmentCount(token, messId);
  return { messId, unreadCount: response.unreadCount };
});

export const markBazarAssignmentsRead = createAsyncThunk<
  { messId: number },
  void,
  { state: BazarNotificationsRootState }
>("bazarNotifications/markRead", async (_arg, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  await api.markBazarAssignmentNotificationsRead(token, messId);
  return { messId };
});

const bazarNotificationsSlice = createSlice({
  name: "bazarNotifications",
  initialState: initialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(syncMessScope, (state, action) => {
        if (state.scopeMessId === action.payload) return;
        return initialState(action.payload);
      })
      .addCase(loadUnreadBazarAssignmentCount.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.unreadCount = Math.max(0, action.payload.unreadCount);
      })
      .addCase(markBazarAssignmentsRead.pending, (state) => {
        state.unreadCount = 0;
      })
      .addCase(markBazarAssignmentsRead.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.unreadCount = 0;
      });
  },
});

export const selectBazarNotificationsState = (state: BazarNotificationsRootState) =>
  state.bazarNotifications;
export default bazarNotificationsSlice.reducer;
