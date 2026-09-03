import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { api } from "@/lib/api";
import type { AuthState } from "@/redux/slice/authSlice";
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

let notificationCounter = 0;
const createNotificationId = () =>
  `n_${++notificationCounter}_${Date.now()}`;

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
export const markAllNotificationsRead = createAction(
  "notification/markAllRead",
);
export const markNotificationRead = createAction<string>(
  "notification/markRead",
);
export const openNotificationPanel = createAction("notification/openPanel");
export const closeNotificationPanel = createAction("notification/closePanel");

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
>(
  "notification/refresh",
  async (_arg, { getState }) => {
    const startState = getState();
    const { token, activeMess } = startState.auth;
    const scopeKey = startState.notification.scopeKey;
    if (!token || !activeMess || !scopeKey) {
      return { scopeKey: scopeKey ?? "", stale: true, notifications: [] };
    }

    const isFirstPoll = startState.notification.isFirstPoll;
    const previousRequestIds = new Set(
      startState.notification.seenRequestIds,
    );
    const previousOptOuts = new Set(startState.notification.seenOptOuts);
    const newNotifications: AppNotification[] = [];

    const serverNotificationsPromise = api
      .getNotifications(token, activeMess.id)
      .catch(() => null);
    const memberRequestsPromise =
      activeMess.role === "admin"
        ? api.getMemberRequests(token, activeMess.id).catch(() => null)
        : Promise.resolve(null);
    const mealOptOutsPromise =
      activeMess.role === "admin"
        ? api.getMealOptOuts(activeMess.id, undefined, token).catch(() => null)
        : Promise.resolve(null);
    const [serverResult, memberResult, mealResult] = await Promise.all([
      serverNotificationsPromise,
      memberRequestsPromise,
      mealOptOutsPromise,
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
      if (!isFirstPoll) {
        memberResult.requests.forEach((request) => {
          if (!previousRequestIds.has(request.id)) {
            newNotifications.push({
              id: createNotificationId(),
              type: "member_request",
              title: "New Join Request",
              body: `${request.name} wants to join your mess`,
              timestamp: Date.now(),
              read: false,
              route: "/member-requests",
            });
          }
        });
      }
    }

    let seenOptOuts: string[] | undefined;
    if (mealResult) {
      const mealTypes = ["breakfast", "lunch", "dinner"] as const;
      const currentOptOuts = new Set<string>();
      const consumerNames = new Map<number, string>();

      mealResult.consumers.forEach((consumer) => {
        consumerNames.set(consumer.consumerId, consumer.consumerName);
        mealTypes.forEach((meal) => {
          if (consumer[meal]) {
            currentOptOuts.add(`${consumer.consumerId}:${meal}`);
          }
        });
      });

      if (!isFirstPoll) {
        currentOptOuts.forEach((key) => {
          if (previousOptOuts.has(key)) return;
          const [consumerId, meal] = key.split(":");
          const name =
            consumerNames.get(parseInt(consumerId, 10)) ?? "A member";
          const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);
          newNotifications.push({
            id: createNotificationId(),
            type: "meal_opt_out",
            title: "Meal Turned Off",
            body: `${name} opted out of ${mealLabel} today`,
            timestamp: Date.now(),
            read: false,
            route: "/meal-status",
          });
        });

        previousOptOuts.forEach((key) => {
          if (currentOptOuts.has(key)) return;
          const [consumerId, meal] = key.split(":");
          const name =
            consumerNames.get(parseInt(consumerId, 10)) ?? "A member";
          const mealLabel = meal.charAt(0).toUpperCase() + meal.slice(1);
          newNotifications.push({
            id: createNotificationId(),
            type: "meal_opt_out",
            title: "Meal Turned On",
            body: `${name} turned ${mealLabel} back on today`,
            timestamp: Date.now(),
            read: false,
            route: "/meal-status",
          });
        });
      }
      seenOptOuts = [...currentOptOuts];
    }

    const serverNotifications: AppNotification[] =
      serverResult?.notifications.map((notification) => ({
        id: `server_${notification.id}`,
        type:
          notification.type === "notice" ||
          notification.type === "bazar_assignment"
            || notification.type === "message"
            ? notification.type
            : "notice",
        title: notification.title,
        body: notification.body,
        timestamp: new Date(notification.createdAt).getTime(),
        read: notification.readAt !== null,
        route:
          notification.type === "notice"
            ? "/notice-board"
            : notification.type === "message"
              ? "/messages"
              : "/bazar-list",
      })) ?? [];

    return {
      scopeKey,
      stale: false,
      pendingRequestCount,
      seenRequestIds,
      seenOptOuts,
      notifications: [...serverNotifications, ...newNotifications],
    };
  },
);

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
      .addCase(markAllNotificationsRead, (state) => {
        state.notifications.forEach((notification) => {
          notification.read = true;
        });
      })
      .addCase(markNotificationRead, (state, action) => {
        const notification = state.notifications.find(
          (item) => item.id === action.payload,
        );
        if (notification) notification.read = true;
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
        if (payload.notifications.length > 0) {
          const merged = new Map<string, AppNotification>();
          [...payload.notifications, ...state.notifications].forEach(
            (notification) => {
              merged.set(notification.id, notification);
            },
          );
          state.notifications = [...merged.values()].slice(0, 100);
        }
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
