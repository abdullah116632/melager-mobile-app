import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { flushQueue } from "@/lib/offlineQueue";

export interface NetworkState {
  isOnline: boolean;
  isCheckingNetwork: boolean;
  pendingCount: number;
  isSyncing: boolean;
  requestStatus: "idle" | "loading" | "succeeded" | "failed";
  requestError: string | null;
  offlineActionError: string | null;
}

type NetworkRootState = { network: NetworkState };

const initialState: NetworkState = {
  isOnline: false,
  isCheckingNetwork: true,
  pendingCount: 0,
  isSyncing: false,
  requestStatus: "idle",
  requestError: null,
  offlineActionError: null,
};

export const networkStatusChanged = createAction<boolean | null>(
  "network/statusChanged",
);
export const offlineQueueSizeChanged = createAction<number>(
  "network/offlineQueueSizeChanged",
);
export const offlineActionFailed = createAction<
  "refresh" | "entry" | "update"
>("network/offlineActionFailed");
export const apiActionFailed = createAction<string>("network/apiActionFailed");
export const clearOfflineActionError = createAction(
  "network/clearOfflineActionError",
);

export const syncOfflineQueue = createAsyncThunk<
  number,
  void,
  { state: NetworkRootState }
>("network/syncOfflineQueue", async () => flushQueue(), {
  condition: (_arg, { getState }) => !getState().network.isSyncing,
});

const networkSlice = createSlice({
  name: "network",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(networkStatusChanged, (state, action) => {
        if (action.payload === null) {
          state.isOnline = false;
          state.isCheckingNetwork = true;
          return;
        }
        state.isOnline = action.payload;
        state.isCheckingNetwork = false;
      })
      .addCase(offlineQueueSizeChanged, (state, action) => {
        state.pendingCount = action.payload;
      })
      .addCase(offlineActionFailed, (state, action) => {
        state.offlineActionError =
          action.payload === "refresh"
            ? "Refresh failed because you are offline"
            : action.payload === "entry"
              ? "Data entry failed because you are offline"
              : "Update failed because you are offline";
      })
      .addCase(apiActionFailed, (state, action) => {
        state.offlineActionError = action.payload;
      })
      .addCase(clearOfflineActionError, (state) => {
        state.offlineActionError = null;
      })
      .addCase(syncOfflineQueue.pending, (state) => {
        state.isSyncing = true;
        state.requestStatus = "loading";
        state.requestError = null;
      })
      .addCase(syncOfflineQueue.fulfilled, (state) => {
        state.isSyncing = false;
        state.requestStatus = "succeeded";
        state.requestError = null;
      })
      .addCase(syncOfflineQueue.rejected, (state, action) => {
        state.isSyncing = false;
        state.requestStatus = "failed";
        state.requestError = action.error.message ?? "Sync failed";
      });
  },
});

export const selectNetworkState = (state: NetworkRootState) => state.network;

export default networkSlice.reducer;
