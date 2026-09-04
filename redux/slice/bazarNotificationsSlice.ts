import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import {
  getOfflineDatabase,
  isOfflineDatabaseSupported,
} from "@/offline/database/connection";
import { BazarRepository } from "@/offline/features/bazar/BazarRepository";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";
import type { NetworkState } from "@/redux/slice/networkSlice";

interface BazarNotificationsState {
  unreadCount: number;
  scopeMessId: number | null;
}

type BazarNotificationsRootState = {
  auth: AuthState;
  network: NetworkState;
  bazarNotifications: BazarNotificationsState;
};

const initialState = (
  scopeMessId: number | null = null,
): BazarNotificationsState => ({
  unreadCount: 0,
  scopeMessId,
});

const getAuthContext = (state: BazarNotificationsRootState) => {
  const { token, activeMess, user } = state.auth;
  if (!token || !activeMess || !user) {
    throw new Error("Please select a mess and sign in again.");
  }
  return { token, userId: user.id, messId: activeMess.id };
};

const localUnreadCountReceived = createAction<{
  messId: number;
  unreadCount: number;
}>("bazarNotifications/localUnreadCountReceived");

export const loadUnreadBazarAssignmentCount = createAsyncThunk<
  { messId: number; unreadCount: number },
  void,
  { state: BazarNotificationsRootState }
>(
  "bazarNotifications/loadUnreadCount",
  async (_arg, { dispatch, getState }) => {
    const context = getAuthContext(getState());
    if (!isOfflineDatabaseSupported()) {
      if (!getState().network.isOnline) {
        return { messId: context.messId, unreadCount: 0 };
      }
      const response = await api.getUnreadBazarAssignmentCount(
        context.token,
        context.messId,
      );
      return { messId: context.messId, unreadCount: response.unreadCount };
    }

    const database = await getOfflineDatabase();
    const repository = new BazarRepository(database);
    const localUnreadCount = await repository.getUnreadCount(
      context.userId,
      context.messId,
    );
    dispatch(
      localUnreadCountReceived({
        messId: context.messId,
        unreadCount: localUnreadCount,
      }),
    );
    if (!getState().network.isOnline) {
      return { messId: context.messId, unreadCount: localUnreadCount };
    }

    const remote = await api.getUnreadBazarAssignmentCount(
      context.token,
      context.messId,
    );
    const unreadCount = await repository.replaceRemoteUnreadCount(
      context.userId,
      context.messId,
      remote.unreadCount,
    );
    return {
      messId: context.messId,
      unreadCount,
    };
  },
);

export const markBazarAssignmentsRead = createAsyncThunk<
  { messId: number },
  void,
  { state: BazarNotificationsRootState }
>("bazarNotifications/markRead", async (_arg, { getState }) => {
  const context = getAuthContext(getState());
  if (!isOfflineDatabaseSupported()) {
    if (getState().network.isOnline) {
      await api.markBazarAssignmentNotificationsRead(
        context.token,
        context.messId,
      );
    }
    return { messId: context.messId };
  }

  const database = await getOfflineDatabase();
  await new BazarRepository(database).markNotificationsRead(
    context.userId,
    context.messId,
  );
  if (getState().network.isOnline) {
    await getOfflineRuntime(database).engine.sync(context);
  }
  return { messId: context.messId };
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
      .addCase(localUnreadCountReceived, (state, action) => {
        if (
          state.scopeMessId !== null &&
          state.scopeMessId !== action.payload.messId
        )
          return;
        state.scopeMessId = action.payload.messId;
        state.unreadCount = Math.max(0, action.payload.unreadCount);
      })
      .addCase(loadUnreadBazarAssignmentCount.fulfilled, (state, action) => {
        if (
          state.scopeMessId !== null &&
          state.scopeMessId !== action.payload.messId
        )
          return;
        state.scopeMessId = action.payload.messId;
        state.unreadCount = Math.max(0, action.payload.unreadCount);
      })
      .addCase(markBazarAssignmentsRead.pending, (state) => {
        state.unreadCount = 0;
      })
      .addCase(markBazarAssignmentsRead.fulfilled, (state, action) => {
        if (
          state.scopeMessId !== null &&
          state.scopeMessId !== action.payload.messId
        )
          return;
        state.scopeMessId = action.payload.messId;
        state.unreadCount = 0;
      });
  },
});

export const selectBazarNotificationsState = (
  state: BazarNotificationsRootState,
) => state.bazarNotifications;
export default bazarNotificationsSlice.reducer;
