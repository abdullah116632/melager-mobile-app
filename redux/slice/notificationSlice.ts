import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api, type ApiServerNotification } from "@/lib/api";
import {
  getOfflineDatabase,
  isOfflineDatabaseSupported,
} from "@/offline/database/connection";
import { NotificationRepository } from "@/offline/features/notifications/NotificationRepository";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import type { AuthState } from "@/redux/slice/authSlice";
import type { NetworkState } from "@/redux/slice/networkSlice";
import type { AppNotification } from "@/types/notification";

export interface NotificationState {
  pendingRequestCount: number;
  notifications: AppNotification[];
  panelVisible: boolean;
  scopeKey: string | null;
  seenRequestIds: number[];
  seenOptOuts: string[];
  isFirstPoll: boolean;
  requestStatus: "idle" | "loading" | "succeeded" | "failed";
  requestError: string | null;
}

type NotificationRootState = {
  auth: AuthState;
  notification: NotificationState;
  network: NetworkState;
};

const createInitialState = (): NotificationState => ({
  pendingRequestCount: 0,
  notifications: [],
  panelVisible: false,
  scopeKey: null,
  seenRequestIds: [],
  seenOptOuts: [],
  isFirstPoll: true,
  requestStatus: "idle",
  requestError: null,
});

const initialState = createInitialState();

const notificationRoute = (type: string): AppNotification["route"] =>
  type === "member_request"
    ? "/member-requests"
    : type === "member_request_accepted"
      ? "/"
      : type === "meal_opt_out"
        ? "/meal-status"
        : type === "notice"
          ? "/notice-board"
          : type === "message"
            ? "/messages"
            : type === "menu"
              ? "/meal-status"
              : "/bazar-list";

const toAppNotification = (
  notification: ApiServerNotification,
): AppNotification => ({
  id: `server_${notification.id}`,
  type:
    notification.type === "member_request" ||
    notification.type === "member_request_accepted" ||
    notification.type === "meal_opt_out" ||
    notification.type === "notice" ||
    notification.type === "message" ||
    notification.type === "menu"
      ? notification.type
      : "notice",
  title: notification.title,
  body: notification.body,
  timestamp: new Date(notification.createdAt).getTime(),
  read: notification.readAt !== null,
  route: notificationRoute(notification.type),
});

export const getNotificationScopeKey = (token: string, messId: number) => {
  let tokenHash = 5381;
  for (let index = 0; index < token.length; index += 1) {
    tokenHash = (tokenHash * 33) ^ token.charCodeAt(index);
  }
  return `${messId}:${tokenHash >>> 0}`;
};

export const syncNotificationScope = createAction<string | null>(
  "notification/syncScope",
);
const notificationCacheReceived = createAction<{
  scopeKey: string;
  notifications: AppNotification[];
}>("notification/cacheReceived");

export const markNotificationRead = createAsyncThunk<
  void,
  string,
  { state: NotificationRootState }
>("notification/markRead", async (id, { getState }) => {
  if (!id.startsWith("server_")) return;
  const serverId = Number(id.slice("server_".length));
  const { token, user, activeMess } = getState().auth;
  if (!Number.isInteger(serverId) || !user || !activeMess) return;
  if (isOfflineDatabaseSupported()) {
    const database = await getOfflineDatabase();
    await new NotificationRepository(database).markRead(
      user.id,
      activeMess.id,
      serverId,
    );
    if (token && getState().network.isOnline) {
      void getOfflineRuntime(database).engine.sync(
        { userId: user.id, messId: activeMess.id, token },
        { collections: ["notifications"], force: true },
      );
    }
    return;
  }
  if (token && getState().network.isOnline) {
    await api.markServerNotificationRead(serverId, token);
  }
});

export const markAllNotificationsRead = createAsyncThunk<
  void,
  void,
  { state: NotificationRootState }
>("notification/markAllRead", async (_arg, { getState }) => {
  const state = getState();
  const { token, user, activeMess } = state.auth;
  if (!user || !activeMess) return;
  if (isOfflineDatabaseSupported()) {
    const database = await getOfflineDatabase();
    await new NotificationRepository(database).markAllRead(
      user.id,
      activeMess.id,
    );
    if (token && getState().network.isOnline) {
      void getOfflineRuntime(database).engine.sync(
        { userId: user.id, messId: activeMess.id, token },
        { collections: ["notifications"], force: true },
      );
    }
    return;
  }
  if (!token || !state.network.isOnline) return;
  const ids = state.notification.notifications.flatMap((notification) => {
    const serverId = notification.id.startsWith("server_")
      ? Number(notification.id.slice("server_".length))
      : NaN;
    return !notification.read && Number.isInteger(serverId) ? [serverId] : [];
  });
  await Promise.all(
    ids.map((serverId) => api.markServerNotificationRead(serverId, token)),
  );
});
export const markNotificationsByTypeRead = createAction<
  AppNotification["type"]
>("notification/markTypeRead");
export const openNotificationPanel = createAction("notification/openPanel");
export const closeNotificationPanel = createAction("notification/closePanel");

export const ingestServerNotification = createAsyncThunk<
  { scopeKey: string; notification: AppNotification } | null,
  ApiServerNotification,
  { state: NotificationRootState }
>("notification/ingestServer", async (notification, { getState }) => {
  const state = getState();
  const { user, activeMess, token } = state.auth;
  const scopeKey = state.notification.scopeKey;
  if (
    !notification ||
    !user ||
    !activeMess ||
    !token ||
    !scopeKey ||
    notification.messId !== activeMess.id ||
    !Number.isInteger(notification.id) ||
    notification.id <= 0 ||
    notification.type === "message" ||
    notification.type === "notice"
  ) {
    return null;
  }
  if (isOfflineDatabaseSupported()) {
    await new NotificationRepository(await getOfflineDatabase()).mergeOne(
      user.id,
      notification,
    );
  }
  return { scopeKey, notification: toAppNotification(notification) };
});

interface RefreshNotificationResult {
  scopeKey: string;
  stale: boolean;
  pendingRequestCount?: number;
  seenRequestIds?: number[];
  seenOptOuts?: string[];
  notifications: AppNotification[];
}

export const refreshNotifications = createAsyncThunk<
  RefreshNotificationResult,
  void,
  { state: NotificationRootState }
>("notification/refresh", async (_arg, { dispatch, getState }) => {
  const startState = getState();
  const { token, activeMess, user } = startState.auth;
  const scopeKey = startState.notification.scopeKey;
  if (!token || !activeMess || !user || !scopeKey) {
    return { scopeKey: scopeKey ?? "", stale: true, notifications: [] };
  }

  let localNotifications: AppNotification[] = [];
  let repository: NotificationRepository | null = null;
  if (isOfflineDatabaseSupported()) {
    try {
      repository = new NotificationRepository(await getOfflineDatabase());
      localNotifications = (await repository.list(user.id, activeMess.id)).map(
        toAppNotification,
      );
      dispatch(
        notificationCacheReceived({
          scopeKey,
          notifications: localNotifications,
        }),
      );
    } catch {
      repository = null;
    }
  }
  if (!startState.network.isOnline) {
    return {
      scopeKey,
      stale: false,
      notifications: localNotifications,
    };
  }

  const serverNotificationsPromise = api
    .getNotifications(token, activeMess.id)
    .catch(() => null);
  const memberRequestsPromise =
    activeMess.role === "admin"
      ? api.getMemberRequests(token, activeMess.id).catch(() => null)
      : Promise.resolve(null);
  const [serverResult, memberResult] = await Promise.all([
    serverNotificationsPromise,
    memberRequestsPromise,
  ]);

  const currentState = getState();
  const currentToken = currentState.auth.token;
  const currentMess = currentState.auth.activeMess;
  if (
    currentState.notification.scopeKey !== scopeKey ||
    !currentToken ||
    currentMess?.id !== activeMess.id ||
    getNotificationScopeKey(currentToken, currentMess.id) !== scopeKey
  ) {
    return { scopeKey, stale: true, notifications: [] };
  }

  let pendingRequestCount: number | undefined;
  let seenRequestIds: number[] | undefined;
  if (memberResult) {
    pendingRequestCount = memberResult.requests.length;
    seenRequestIds = memberResult.requests.map((request) => request.id);
  }

  let serverNotifications =
    serverResult?.notifications.map(toAppNotification) ?? localNotifications;
  if (serverResult && repository) {
    try {
      serverNotifications = (
        await repository.merge(
          user.id,
          activeMess.id,
          serverResult.notifications,
        )
      ).map(toAppNotification);
    } catch {}
  }

  return {
    scopeKey,
    stale: false,
    pendingRequestCount,
    seenRequestIds,
    notifications: serverNotifications,
  };
});

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(syncNotificationScope, (state, action) => {
        if (state.scopeKey === action.payload) return;
        Object.assign(state, createInitialState(), {
          scopeKey: action.payload,
        });
      })
      .addCase(notificationCacheReceived, (state, action) => {
        if (state.scopeKey !== action.payload.scopeKey) return;
        state.notifications = action.payload.notifications;
      })
      .addCase(ingestServerNotification.fulfilled, (state, action) => {
        if (!action.payload || state.scopeKey !== action.payload.scopeKey)
          return;
        const withoutExisting = state.notifications.filter(
          (notification) => notification.id !== action.payload!.notification.id,
        );
        state.notifications = [
          action.payload.notification,
          ...withoutExisting,
        ].slice(0, 100);
      })
      .addCase(markAllNotificationsRead.pending, (state) => {
        state.notifications.forEach((notification) => {
          notification.read = true;
        });
      })
      .addCase(markNotificationRead.pending, (state, action) => {
        const notification = state.notifications.find(
          (item) => item.id === action.meta.arg,
        );
        if (notification) notification.read = true;
      })
      .addCase(markNotificationsByTypeRead, (state, action) => {
        state.notifications.forEach((notification) => {
          if (notification.type === action.payload) notification.read = true;
        });
      })
      .addCase(openNotificationPanel, (state) => {
        state.panelVisible = true;
      })
      .addCase(closeNotificationPanel, (state) => {
        state.panelVisible = false;
      })
      .addCase(refreshNotifications.pending, (state) => {
        state.requestStatus = "loading";
        state.requestError = null;
      })
      .addCase(refreshNotifications.fulfilled, (state, action) => {
        state.requestStatus = "succeeded";
        state.requestError = null;
        const payload = action.payload;
        if (payload.stale || state.scopeKey !== payload.scopeKey) return;
        if (payload.pendingRequestCount != null) {
          state.pendingRequestCount = payload.pendingRequestCount;
        }
        if (payload.seenRequestIds) {
          state.seenRequestIds = payload.seenRequestIds;
        }
        if (payload.seenOptOuts) state.seenOptOuts = payload.seenOptOuts;
        state.isFirstPoll = false;
        // API/SQLite provide a complete general-notification snapshot.
        // Message and notice unread state live in their dedicated stores.
        state.notifications = payload.notifications.slice(0, 100);
      })
      .addCase(refreshNotifications.rejected, (state, action) => {
        state.requestStatus = "failed";
        state.requestError = action.error.message ?? "Refresh failed";
      });
  },
});

export const selectNotificationState = (state: NotificationRootState) =>
  state.notification;

export default notificationSlice.reducer;
