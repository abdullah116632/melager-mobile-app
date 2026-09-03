import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import {
  api,
  type ApiBazarAssignment,
  type ApiBazarItem,
  type ApiConsumer,
} from "@/lib/api";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";

export interface BazarState {
  items: ApiBazarItem[];
  assignments: ApiBazarAssignment[];
  consumers: ApiConsumer[];
  scopeMessId: number | null;
  loadStatus: "idle" | "loading" | "succeeded" | "failed";
  mutationStatus: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

type BazarRootState = { auth: AuthState; bazar: BazarState };

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
  const [bazar, members] = await Promise.all([
    api.getBazar(token, messId),
    includeConsumers ? api.getMessConsumers(token, messId) : Promise.resolve({ consumers: [] }),
  ]);
  return { messId, items: bazar.items, assignments: bazar.assignments, consumers: members.consumers };
});

export const createBazarItem = createAsyncThunk<ApiBazarItem, { weekday: number; name: string; price: number }, { state: BazarRootState }>(
  "bazar/createItem",
  async (input, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    return (await api.createBazarItem(input.weekday, input.name, input.price, token, messId)).item;
  },
);

export const updateBazarItem = createAsyncThunk<ApiBazarItem, { id: number; name: string; price: number }, { state: BazarRootState }>(
  "bazar/updateItem",
  async (input, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    return (await api.updateBazarItem(input.id, input.name, input.price, token, messId)).item;
  },
);

export const updateBazarItemStatus = createAsyncThunk<ApiBazarItem, { id: number; completed: boolean }, { state: BazarRootState }>(
  "bazar/updateItemStatus",
  async (input, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    return (await api.updateBazarItemStatus(input.id, input.completed, token, messId)).item;
  },
);

export const deleteBazarItem = createAsyncThunk<number, number, { state: BazarRootState }>(
  "bazar/deleteItem",
  async (id, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    await api.deleteBazarItem(id, token, messId);
    return id;
  },
);

export const deleteBazarItems = createAsyncThunk<number, number, { state: BazarRootState }>(
  "bazar/deleteItems",
  async (weekday, { getState }) => {
    const { token, messId } = getAuthContext(getState());
    await api.deleteBazarItems(weekday, token, messId);
    return weekday;
  },
);

export const assignBazarMembers = createAsyncThunk<ApiBazarAssignment[], { weekday: number; consumerIds: number[] }, { state: BazarRootState }>(
  "bazar/assignMembers",
  async (input, { getState }) => {
    const { token, messId } = getAuthContext(getState());
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
