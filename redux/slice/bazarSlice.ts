import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  api,
  type ApiBazarAssignment,
  type ApiBazarItem,
  type ApiConsumer,
} from "@/lib/api";
import { loadBazarFromCache, saveBazarToCache } from "@/lib/cache";
import { enqueue } from "@/lib/offlineQueue";
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
  error: string | null;
}

type BazarRootState = { auth: AuthState; bazar: BazarState; network: NetworkState };
const offlineKey = (kind: string) => `bazar:${kind}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

const createInitialState = (scopeMessId: number | null = null): BazarState => ({
  items: [],
  assignments: [],
  consumers: [],
  scopeMessId,
  loadStatus: "idle",
  mutationStatus: "idle",
  error: null,
});

const getAuthContext = (state: BazarRootState) => {
  const { token, activeMess } = state.auth;
  if (!token || !activeMess) throw new Error("Please select a mess and sign in again.");
  return { token, messId: activeMess.id };
};

export const loadBazar = createAsyncThunk<
  { messId: number; items: ApiBazarItem[]; assignments: ApiBazarAssignment[]; consumers: ApiConsumer[] },
  { includeConsumers: boolean },
  { state: BazarRootState }
>("bazar/load", async ({ includeConsumers }, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const cached = await loadBazarFromCache(messId);
  if (!getState().network.isOnline) {
    if (!cached) throw new Error("No cached bazar list is available yet.");
    return { messId, ...cached };
  }
  try {
    const [bazar, members] = await Promise.all([
      api.getBazar(token, messId),
      includeConsumers ? api.getMessConsumers(token, messId) : Promise.resolve({ consumers: [] }),
    ]);
    const data = { items: bazar.items, assignments: bazar.assignments, consumers: members.consumers };
    await saveBazarToCache(messId, data);
    return { messId, ...data };
  } catch (error) {
    if (cached) return { messId, ...cached };
    throw error;
  }
});

export const createBazarItem = createAsyncThunk<ApiBazarItem, { weekday: number; name: string; price: number }, { state: BazarRootState }>(
  "bazar/createItem",
  async (input, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    if (!getState().network.isOnline) {
      const now = new Date().toISOString();
      const item: ApiBazarItem = { id: -Date.now(), messId, weekday: input.weekday, name: input.name, price: input.price, isCompleted: false, createdByUserId: 0, createdAt: now, updatedAt: now };
      await enqueue({ type: "BAZAR_CREATE_ITEM", key: offlineKey("create"), payload: { tempId: item.id, ...input, messId }, token });
      return item;
    }
    return (await api.createBazarItem(input.weekday, input.name, input.price, token, messId)).item;
  },
);

export const updateBazarItem = createAsyncThunk<ApiBazarItem, { id: number; name: string; price: number }, { state: BazarRootState }>(
  "bazar/updateItem",
  async (input, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    if (!getState().network.isOnline) {
      const existing = getState().bazar.items.find((item) => item.id === input.id);
      if (!existing) throw new Error("Bazar item not found.");
      const item = { ...existing, name: input.name, price: input.price, updatedAt: new Date().toISOString() };
      await enqueue({ type: "BAZAR_UPDATE_ITEM", key: offlineKey("update"), payload: { ...input, messId }, token });
      return item;
    }
    return (await api.updateBazarItem(input.id, input.name, input.price, token, messId)).item;
  },
);

export const updateBazarItemStatus = createAsyncThunk<ApiBazarItem, { id: number; completed: boolean }, { state: BazarRootState }>(
  "bazar/updateItemStatus",
  async (input, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    if (!getState().network.isOnline) {
      const existing = getState().bazar.items.find((item) => item.id === input.id);
      if (!existing) throw new Error("Bazar item not found.");
      const item = { ...existing, isCompleted: input.completed, updatedAt: new Date().toISOString() };
      await enqueue({ type: "BAZAR_UPDATE_STATUS", key: offlineKey("status"), payload: { ...input, messId }, token });
      return item;
    }
    return (await api.updateBazarItemStatus(input.id, input.completed, token, messId)).item;
  },
);

export const deleteBazarItem = createAsyncThunk<number, number, { state: BazarRootState }>(
  "bazar/deleteItem",
  async (id, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    if (!getState().network.isOnline) {
      await enqueue({ type: "BAZAR_DELETE_ITEM", key: offlineKey("delete"), payload: { id, messId }, token });
      return id;
    }
    await api.deleteBazarItem(id, token, messId);
    return id;
  },
);

export const deleteBazarItems = createAsyncThunk<number, number, { state: BazarRootState }>(
  "bazar/deleteItems",
  async (weekday, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    if (!getState().network.isOnline) {
      await enqueue({ type: "BAZAR_DELETE_ITEMS", key: offlineKey("clear"), payload: { weekday, messId }, token });
      return weekday;
    }
    await api.deleteBazarItems(weekday, token, messId);
    return weekday;
  },
);

export const assignBazarMembers = createAsyncThunk<ApiBazarAssignment[], { weekday: number; consumerIds: number[] }, { state: BazarRootState }>(
  "bazar/assignMembers",
  async (input, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    if (!getState().network.isOnline) {
      const assignments = input.consumerIds.map((consumerId, index) => {
        const consumer = getState().bazar.consumers.find((item) => item.id === consumerId);
        return { id: -(Date.now() + index), weekday: input.weekday, consumerId, name: consumer?.name ?? null, email: consumer?.email ?? null };
      });
      await enqueue({ type: "BAZAR_ASSIGN_MEMBERS", key: offlineKey("assign"), payload: { ...input, messId }, token });
      return assignments;
    }
    return (await api.assignBazarMembers(input.weekday, input.consumerIds, token, messId)).assignments;
  },
);

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
      .addCase(loadBazar.pending, (state) => {
        state.loadStatus = "loading";
        state.error = null;
      })
      .addCase(loadBazar.fulfilled, (state, action) => {
        state.scopeMessId = action.payload.messId;
        state.items = action.payload.items;
        state.assignments = action.payload.assignments;
        state.consumers = action.payload.consumers;
        state.loadStatus = "succeeded";
      })
      .addCase(loadBazar.rejected, (state, action) => {
        state.loadStatus = "failed";
        state.error = action.error.message ?? "Could not load bazar list";
      })
      .addCase(createBazarItem.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.mutationStatus = "succeeded";
      })
      .addCase(updateBazarItem.fulfilled, (state, action) => {
        state.items = state.items.map((item) => item.id === action.payload.id ? action.payload : item);
        state.mutationStatus = "succeeded";
      })
      .addCase(updateBazarItemStatus.fulfilled, (state, action) => {
        state.items = state.items.map((item) => item.id === action.payload.id ? action.payload : item);
        state.mutationStatus = "succeeded";
      })
      .addCase(deleteBazarItem.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.mutationStatus = "succeeded";
      })
      .addCase(deleteBazarItems.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.weekday !== action.payload);
        state.mutationStatus = "succeeded";
      })
      .addCase(assignBazarMembers.fulfilled, (state, action) => {
        const existing = new Set(state.assignments.map((assignment) => assignment.id));
        state.assignments.push(...action.payload.filter((assignment) => !existing.has(assignment.id)));
        state.mutationStatus = "succeeded";
      })
      .addMatcher(
        (action) => action.type.startsWith("bazar/") && action.type.endsWith("/pending") && action.type !== loadBazar.pending.type,
        (state) => {
          state.mutationStatus = "loading";
          state.error = null;
        },
      )
      .addMatcher(
        (action) => action.type.startsWith("bazar/") && action.type.endsWith("/rejected"),
        (state) => {
          state.mutationStatus = "failed";
          state.error = "Bazar request failed";
        },
      );
  },
});

export const selectBazarState = (state: BazarRootState) => state.bazar;
export default bazarSlice.reducer;
