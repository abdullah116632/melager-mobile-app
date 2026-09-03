import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { api, type ApiMessage, type ApiMessageCursor } from "@/lib/api";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";

export interface MessagesState {
  messages: ApiMessage[];
  nextCursor: ApiMessageCursor | null;
  hasMore: boolean;
  scopeMessId: number | null;
  loadStatus: "idle" | "loading" | "succeeded" | "failed";
  loadMoreStatus: "idle" | "loading" | "succeeded" | "failed";
  sendStatus: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

type MessagesRootState = { auth: AuthState; messages: MessagesState };

const initialState: MessagesState = {
  messages: [],
  nextCursor: null,
  hasMore: true,
  scopeMessId: null,
  loadStatus: "idle",
  loadMoreStatus: "idle",
  sendStatus: "idle",
  error: null,
};

const getAuthContext = (state: MessagesRootState) => {
  const { token, activeMess } = state.auth;
  if (!token || !activeMess) throw new Error("Please select a mess and sign in again.");
  return { token, messId: activeMess.id };
};

export const loadMessages = createAsyncThunk<
  { messId: number; messages: ApiMessage[]; nextCursor: ApiMessageCursor | null; append: boolean },
  { beforeCreatedAt?: string; beforeId?: number } | undefined,
  { state: MessagesRootState }
>("messages/load", async (cursor, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.getMessages(token, messId, cursor);
  return {
    messId,
    messages: response.messages,
    nextCursor: response.nextCursor,
    append: Boolean(cursor?.beforeCreatedAt && cursor.beforeId),
  };
});

export const sendMessage = createAsyncThunk<
  { messId: number; message: ApiMessage },
  string,
  { state: MessagesRootState }
>("messages/send", async (body, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.sendMessage(body, token, messId);
  return { messId, message: response.message };
});

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(syncMessScope, (state, action) => {
        if (state.scopeMessId === action.payload) return;
        return { ...initialState, scopeMessId: action.payload };
      })
      .addCase(loadMessages.pending, (state, action) => {
        state.error = null;
        if (action.meta.arg?.beforeCreatedAt) {
          state.loadMoreStatus = "loading";
        } else {
          state.loadStatus = "loading";
        }
      })
      .addCase(loadMessages.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        if (action.payload.append) {
          const existingIds = new Set(state.messages.map((message) => message.id));
          state.messages.push(
            ...action.payload.messages.filter((message) => !existingIds.has(message.id)),
          );
          state.loadMoreStatus = "succeeded";
        } else {
          state.messages = action.payload.messages;
          state.loadStatus = "succeeded";
        }
        state.nextCursor = action.payload.nextCursor;
        state.hasMore = action.payload.nextCursor !== null;
      })
      .addCase(loadMessages.rejected, (state, action) => {
        if (action.meta.arg?.beforeCreatedAt) {
          state.loadMoreStatus = "failed";
        } else {
          state.loadStatus = "failed";
        }
        state.error = action.error.message ?? "Could not load messages";
      })
      .addCase(sendMessage.pending, (state, action) => {
        state.sendStatus = "loading";
        state.error = null;
        const activeMess = state.scopeMessId;
        if (activeMess === null) return;
        state.messages.unshift({
          id: -Date.now(),
          messId: activeMess,
          senderUserId: 0,
          senderName: "You",
          body: action.meta.arg,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        const pendingIndex = state.messages.findIndex(
          (message) => message.senderUserId === 0 && message.body === action.meta.arg,
        );
        if (pendingIndex >= 0) state.messages.splice(pendingIndex, 1);
        state.messages.unshift(action.payload.message);
        state.sendStatus = "succeeded";
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const pendingIndex = state.messages.findIndex(
          (message) => message.senderUserId === 0 && message.body === action.meta.arg,
        );
        if (pendingIndex >= 0) state.messages.splice(pendingIndex, 1);
        state.sendStatus = "failed";
        state.error = action.error.message ?? "Could not send message";
      });
  },
});

export const selectMessagesState = (state: MessagesRootState) => state.messages;
export default messagesSlice.reducer;
