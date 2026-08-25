import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { flushQueue } from "@/lib/offlineQueue";

export interface NetworkState {
  isOnline: boolean;
  isCheckingNetwork: boolean;
  pendingCount: number;
  isSyncing: boolean;
  requestStatus: "idle" | "loading" | "succeeded" | "failed";
  requestError: string | null;
}

type NetworkRootState = { network: NetworkState };

const initialState: NetworkState = {
  isOnline: false,
  isCheckingNetwork: true,
  pendingCount: 0,
  isSyncing: false,
  requestStatus: "idle",
  requestError: null,
};

export const networkStatusChanged = createAction<boolean>(
  "network/statusChanged",
);
export const offlineQueueSizeChanged = createAction<number>(
  "network/offlineQueueSizeChanged",
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
        state.isOnline = action.payload;
        state.isCheckingNetwork = false;
      })
      .addCase(offlineQueueSizeChanged, (state, action) => {
        state.pendingCount = action.payload;
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
