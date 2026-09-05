import {
  createAction,
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

import { api, type ApiMessage, type ApiMessageCursor } from "@/lib/api";
import { getOfflineDatabase } from "@/offline/database/connection";
import {
  MessageRepository,
  type MessageItem,
  type MessagePage,
} from "@/offline/features/messages/MessageRepository";
import type { MessageDeliveryState } from "@/offline/features/messages/messageLifecycle";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import type { AuthState } from "@/redux/slice/authSlice";
import { syncMessScope } from "@/redux/slice/messSlice";

export interface MessagesState {
  messages: MessageItem[];
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
  const { token, activeMess, user } = state.auth;
  if (!token || !activeMess || !user)
    throw new Error("Please select a mess and sign in again.");
  return { token, messId: activeMess.id, userId: user.id };
};

const serverMessage = (message: ApiMessage): MessageItem => ({
  ...message,
  localId: message.clientMutationId ?? String(message.id),
  serverId: message.id,
  status: "sent",
});

const messageKey = (message: MessageItem): string =>
  message.serverId !== null
    ? `server:${message.serverId}`
    : `local:${message.localId}`;

const sortMessages = (messages: MessageItem[]): void => {
  messages.sort((left, right) => {
    const timeDifference =
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return timeDifference || (right.serverId ?? 0) - (left.serverId ?? 0);
  });
};

const cachedMessagesReceived = createAction<{
  messId: number;
  page: MessagePage;
}>("messages/cachedMessagesReceived");

export const hydrateMessagesFromLocal = createAsyncThunk<
  { messId: number; page: MessagePage; unreadCount: number } | null,
  void,
  { state: MessagesRootState }
>("messages/hydrateFromLocal", async (_arg, { getState }) => {
  const { messId, userId } = getAuthContext(getState());
  const repository = new MessageRepository(await getOfflineDatabase());
  const [page, unreadCount] = await Promise.all([
    repository.listPage(userId, messId),
    repository.getUnreadCount(userId, messId),
  ]);
  return { messId, page, unreadCount };
});

export const loadMessages = createAsyncThunk<
  {
    messId: number;
    messages: MessageItem[];
    nextCursor: ApiMessageCursor | null;
    append: boolean;
    source: "server" | "local";
  },
  { beforeCreatedAt?: string; beforeId?: number } | undefined,
  { state: MessagesRootState }
>("messages/load", async (cursor, { getState, dispatch }) => {
  const { token, messId, userId } = getAuthContext(getState());
  const repository = new MessageRepository(await getOfflineDatabase());
  const localCursor =
    cursor?.beforeCreatedAt !== undefined && cursor.beforeId !== undefined
      ? { createdAt: cursor.beforeCreatedAt, id: cursor.beforeId }
      : undefined;
  const localPage = await repository.listPage(userId, messId, localCursor);
  if (!cursor) {
    dispatch(cachedMessagesReceived({ messId, page: localPage }));
  }

  // A zero id is a SQLite-only cursor (for a page of pending messages), so it
  // must not be sent to the server's positive-id pagination endpoint.
  if (localCursor && localCursor.id <= 0) {
    return {
      messId,
      ...localPage,
      append: true,
      source: "local",
    };
  }

  try {
    const response = await api.getMessages(token, messId, cursor);
    await repository.merge(userId, response.messages);
    return {
      messId,
      messages: response.messages.map(serverMessage),
      nextCursor: response.nextCursor,
      append: Boolean(cursor?.beforeCreatedAt && cursor.beforeId !== undefined),
      source: "server",
    };
  } catch {
    return {
      messId,
      ...localPage,
      append: Boolean(localCursor),
      source: "local",
    };
  }
});

export const sendMessage = createAsyncThunk<
  { messId: number; message: MessageItem },
  { body: string; senderUserId: number },
  { state: MessagesRootState }
>("messages/send", async ({ body }, { getState }) => {
  const { token, messId, userId } = getAuthContext(getState());
  try {
    const database = await getOfflineDatabase();
    const message = await new MessageRepository(database).compose(
      userId,
      messId,
      userId,
      body,
    );
    void getOfflineRuntime(database).engine.sync(
      { userId, messId, token },
      { collections: ["messages"], force: true },
    );
    return { messId, message };
  } catch {
    const response = await api.sendMessage(body, token, messId);
    return { messId, message: serverMessage(response.message) };
  }
});

export const loadUnreadMessageCount = createAsyncThunk<
  { messId: number; unreadCount: number },
  void,
  { state: MessagesRootState }
>("messages/loadUnreadCount", async (_arg, { getState }) => {
  const { token, messId, userId } = getAuthContext(getState());
  try {
    const response = await api.getUnreadMessageCount(token, messId);
    return { messId, unreadCount: response.unreadCount };
  } catch {
    const repository = new MessageRepository(await getOfflineDatabase());
    return {
      messId,
      unreadCount: await repository.getUnreadCount(userId, messId),
    };
  }
});

export const markMessagesRead = createAsyncThunk<
  { messId: number; unreadCount: number },
  void,
  { state: MessagesRootState }
>("messages/markRead", async (_arg, { getState }) => {
  const { token, messId, userId } = getAuthContext(getState());
  try {
    const database = await getOfflineDatabase();
    await new MessageRepository(database).markRead(userId, messId);
    void getOfflineRuntime(database).engine.sync(
      { userId, messId, token },
      { collections: ["messages"], force: true },
    );
    return { messId, unreadCount: 0 };
  } catch {
    const response = await api.markMessagesRead(token, messId);
    return { messId, unreadCount: response.unreadCount };
  }
});

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    messageReceived: (state, action: PayloadAction<ApiMessage>) => {
      const incoming = action.payload;
      if (state.scopeMessId !== incoming.messId) return;
      const localIndex = incoming.clientMutationId
        ? state.messages.findIndex(
            (message) => message.localId === incoming.clientMutationId,
          )
        : -1;
      const serverIndex = state.messages.findIndex(
        (message) => message.serverId === incoming.id,
      );
      const replacement = serverMessage(incoming);
      if (localIndex >= 0) {
        state.messages[localIndex] = replacement;
        if (serverIndex >= 0 && serverIndex !== localIndex) {
          state.messages.splice(serverIndex, 1);
        }
      } else if (serverIndex >= 0) {
        state.messages[serverIndex] = replacement;
      } else {
        state.messages.unshift(replacement);
      }
      sortMessages(state.messages);
    },
    messageAcknowledged: (
      state,
      action: PayloadAction<{ localId: string; message: ApiMessage }>,
    ) => {
      if (state.scopeMessId !== action.payload.message.messId) return;
      const replacement = serverMessage({
        ...action.payload.message,
        clientMutationId: action.payload.localId,
      });
      state.messages = state.messages.filter(
        (message) =>
          message.localId !== action.payload.localId &&
          message.serverId !== action.payload.message.id,
      );
      state.messages.unshift(replacement);
      sortMessages(state.messages);
    },
    messageStatusChanged: (
      state,
      action: PayloadAction<{
        localId: string;
        status: MessageDeliveryState;
      }>,
    ) => {
      const message = state.messages.find(
        (item) => item.localId === action.payload.localId,
      );
      if (message) message.status = action.payload.status;
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
      .addCase(cachedMessagesReceived, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        state.messages = action.payload.page.messages;
        state.nextCursor = action.payload.page.nextCursor;
        state.hasMore = action.payload.page.nextCursor !== null;
      })
      .addCase(hydrateMessagesFromLocal.fulfilled, (state, action) => {
        if (!action.payload || state.scopeMessId !== action.payload.messId)
          return;
        state.messages = action.payload.page.messages;
        state.nextCursor = action.payload.page.nextCursor;
        state.hasMore = action.payload.page.nextCursor !== null;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(loadMessages.pending, (state, action) => {
        state.error = null;
        if (action.meta.arg?.beforeCreatedAt) state.loadMoreStatus = "loading";
        else state.loadStatus = "loading";
      })
      .addCase(loadMessages.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        if (action.payload.append) {
          const existing = new Set(state.messages.map(messageKey));
          state.messages.push(
            ...action.payload.messages.filter(
              (message) => !existing.has(messageKey(message)),
            ),
          );
          state.loadMoreStatus = "succeeded";
        } else {
          const fetched = new Set(action.payload.messages.map(messageKey));
          state.messages = [
            ...action.payload.messages,
            ...state.messages.filter(
              (message) => !fetched.has(messageKey(message)),
            ),
          ];
          state.loadStatus = "succeeded";
        }
        sortMessages(state.messages);
        state.nextCursor = action.payload.nextCursor;
        state.hasMore = action.payload.nextCursor !== null;
      })
      .addCase(loadMessages.rejected, (state, action) => {
        if (action.meta.arg?.beforeCreatedAt) state.loadMoreStatus = "failed";
        else state.loadStatus = "failed";
        state.error = action.error.message ?? "Could not load messages";
      })
      .addCase(sendMessage.pending, (state) => {
        state.sendStatus = "loading";
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        if (state.scopeMessId !== action.payload.messId) return;
        if (
          !state.messages.some(
            (message) =>
              messageKey(message) === messageKey(action.payload.message) ||
              message.localId === action.payload.message.localId,
          )
        ) {
          state.messages.unshift(action.payload.message);
        }
        sortMessages(state.messages);
        state.sendStatus = "succeeded";
      })
      .addCase(sendMessage.rejected, (state, action) => {
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
        state.unreadCount = Math.max(0, action.payload.unreadCount);
      });
  },
});

export const {
  messageAcknowledged,
  messageReceived,
  messageStatusChanged,
  unreadMessageReceived,
} = messagesSlice.actions;
export const selectMessagesState = (state: MessagesRootState) => state.messages;
export default messagesSlice.reducer;
