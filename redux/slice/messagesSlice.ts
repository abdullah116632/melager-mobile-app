import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import { api, type ApiMessage, type ApiMessageCursor } from "@/lib/api";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";

export interface MessagesState {
  messages: ApiMessage[];
  nextCursor: ApiMessageCursor | null;
  hasMore: boolean;
  unreadCount: number;
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
  unreadCount: 0,
  scopeMessId: null,
  loadStatus: "idle",
  loadMoreStatus: "idle",
  sendStatus: "idle",
  error: null,
};

const getAuthContext = (state: MessagesRootState) => {
  const { token, activeMess } = state.auth;
  if (!token || !activeMess)
    throw new Error("Please select a mess and sign in again.");
  return { token, messId: activeMess.id };
};

export const loadMessages = createAsyncThunk<
  {
    messId: number;
    messages: ApiMessage[];
    nextCursor: ApiMessageCursor | null;
    append: boolean;
  },
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
  { body: string; senderUserId: number },
  { state: MessagesRootState }
>("messages/send", async ({ body }, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.sendMessage(body, token, messId);
  return { messId, message: response.message };
});

export const loadUnreadMessageCount = createAsyncThunk<
  { messId: number; unreadCount: number },
  void,
  { state: MessagesRootState }
>("messages/loadUnreadCount", async (_arg, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.getUnreadMessageCount(token, messId);
  return { messId, unreadCount: response.unreadCount };
});

export const markMessagesRead = createAsyncThunk<
  { messId: number; unreadCount: number },
  void,
  { state: MessagesRootState }
>("messages/markRead", async (_arg, { getState }) => {
  const { token, messId } = getAuthContext(getState());
  const response = await api.markMessagesRead(token, messId);
  return { messId, unreadCount: response.unreadCount };
});

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    messageReceived: (state, action: PayloadAction<ApiMessage>) => {
      const message = action.payload;
      if (state.scopeMessId !== message.messId) return;
      if (state.messages.some((item) => item.id === message.id)) return;
      state.messages.unshift(message);
    },
    unreadMessageReceived: (state, action: PayloadAction<ApiMessage>) => {
      if (state.scopeMessId !== action.payload.messId) return;
      state.unreadCount += 1;
    },
  },
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
          const existingIds = new Set(
            state.messages.map((message) => message.id),
          );
          state.messages.push(
            ...action.payload.messages.filter(
              (message) => !existingIds.has(message.id),
            ),
          );
          state.loadMoreStatus = "succeeded";
        } else {
          const fetchedIds = new Set(
            action.payload.messages.map((message) => message.id),
          );
          state.messages = [
            ...action.payload.messages,
            ...state.messages.filter((message) => !fetchedIds.has(message.id)),
          ].sort((left, right) => {
            const timeDifference =
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime();
            return timeDifference || right.id - left.id;
          });
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
          senderUserId: action.meta.arg.senderUserId,
          senderName: "You",
          body: action.meta.arg.body,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        const pendingIndex = state.messages.findIndex(
          (message) =>
            message.id < 0 &&
            message.senderUserId === action.meta.arg.senderUserId &&
            message.body === action.meta.arg.body,
        );
        if (pendingIndex >= 0) state.messages.splice(pendingIndex, 1);
        if (
          !state.messages.some(
            (message) => message.id === action.payload.message.id,
          )
        ) {
          state.messages.unshift(action.payload.message);
        }
        state.sendStatus = "succeeded";
      })
      .addCase(sendMessage.rejected, (state, action) => {
        const pendingIndex = state.messages.findIndex(
          (message) =>
            message.id < 0 &&
            message.senderUserId === action.meta.arg.senderUserId &&
            message.body === action.meta.arg.body,
        );
        if (pendingIndex >= 0) state.messages.splice(pendingIndex, 1);
        state.sendStatus = "failed";
        state.error = action.error.message ?? "Could not send message";
      })
      .addCase(loadUnreadMessageCount.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.unreadCount = Math.max(0, action.payload.unreadCount);
      })
      .addCase(markMessagesRead.pending, (state) => {
        state.unreadCount = 0;
      })
      .addCase(markMessagesRead.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.unreadCount = 0;
      });
  },
});

export const { messageReceived, unreadMessageReceived } = messagesSlice.actions;
export const selectMessagesState = (state: MessagesRootState) => state.messages;
export default messagesSlice.reducer;
