import { AppState, type AppStateStatus } from "react-native";
import { useEffect, type ReactNode } from "react";

import { clearApiCache } from "@/lib/api";
import { getOfflineDatabase } from "@/offline/database/connection";
import { MessageRepository } from "@/offline/features/messages/MessageRepository";
import {
  connectRealtime,
  disconnectRealtime,
  isMessageConversationActive,
  subscribeToRealtimeMessages,
} from "@/lib/realtime";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  selectActiveMess,
  selectAuthToken,
  selectAuthUser,
} from "@/redux/slice/authSlice";
import {
  loadUnreadMessageCount,
  markMessagesRead,
  messageReceived,
  unreadMessageReceived,
} from "@/redux/slice/messagesSlice";
import { loadUnreadNoticesCount } from "@/redux/slice/noticesSlice";
import { loadUnreadBazarAssignmentCount } from "@/redux/slice/bazarNotificationsSlice";
import { loadUnreadConsumerBreakdownCount } from "@/redux/slice/consumerBreakdownNotificationsSlice";
import { loadMonth } from "@/redux/slice/messSlice";
import { loadDepositEntries } from "@/redux/slice/depositsSlice";
import { invalidateSchedule } from "@/redux/slice/mealMenuSlice";
import { refreshNotifications } from "@/redux/slice/notificationSlice";

/** Keeps a single authenticated, active-mess Socket.IO connection alive. */
export const RealtimeStateController = ({
  children,
}: {
  children: ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const user = useAppSelector(selectAuthUser);
  const activeMess = useAppSelector(selectActiveMess);
  const messId = activeMess?.id ?? null;

  useEffect(
    () =>
      subscribeToRealtimeMessages((message) => {
        clearApiCache();
        if (user?.id) void getOfflineDatabase().then((db) => new MessageRepository(db).merge(user.id, [message])).catch(() => undefined);
        dispatch(messageReceived(message));
        if (message.senderUserId === user?.id) return;
        if (isMessageConversationActive(message.messId)) {
          void dispatch(markMessagesRead());
        } else {
          dispatch(unreadMessageReceived(message));
        }
      }),
    [dispatch, user?.id],
  );

  useEffect(() => {
    if (!token || !messId) {
      disconnectRealtime();
      return;
    }

    let isActive = AppState.currentState === "active";
    const connect = () => {
      const socket = connectRealtime(token, messId);
      const monthRefreshes = new Map<string, Promise<unknown>>();
      const refreshMonthFromEvent = (payload: unknown) => {
        if (
          !payload ||
          typeof payload !== "object" ||
          typeof (payload as { messId?: unknown }).messId !== "number" ||
          (payload as { messId: number }).messId !== messId
        ) {
          return;
        }
        clearApiCache();
        const event = payload as {
          yearMonth?: unknown;
          yearMonths?: unknown;
          refreshEntries?: unknown;
        };
        const yearMonths = Array.isArray(event.yearMonths)
          ? event.yearMonths.filter(
              (value): value is string => typeof value === "string",
            )
          : typeof event.yearMonth === "string"
            ? [event.yearMonth]
            : [];
        yearMonths.forEach((yearMonth) => {
          const refreshKey = `${messId}:${yearMonth}`;
          const previousRefresh =
            monthRefreshes.get(refreshKey) ?? Promise.resolve();
          const nextRefresh = previousRefresh
            .catch(() => undefined)
            .then(() =>
              Promise.all([
                dispatch(loadMonth({ messId, yearMonth, force: true })),
                event.refreshEntries
                  ? dispatch(
                      loadDepositEntries({ messId, yearMonth, force: true }),
                    )
                  : Promise.resolve(),
              ]),
            )
            .finally(() => {
              if (monthRefreshes.get(refreshKey) === nextRefresh) {
                monthRefreshes.delete(refreshKey);
              }
            });
          monthRefreshes.set(refreshKey, nextRefresh);
        });
      };
      clearApiCache();
      void dispatch(loadUnreadMessageCount());
      void dispatch(loadUnreadNoticesCount());
      void dispatch(loadUnreadBazarAssignmentCount());
      void dispatch(loadUnreadConsumerBreakdownCount());
      socket.on("bazar-assignment:created", () => {
        clearApiCache();
        void dispatch(loadUnreadBazarAssignmentCount());
      });
      socket.on("consumer-breakdown:created", () => {
        clearApiCache();
        void dispatch(loadUnreadConsumerBreakdownCount());
      });
      socket.on("notification:created", () => {
        clearApiCache();
        void dispatch(refreshNotifications());
      });
      socket.on("meals:updated", refreshMonthFromEvent);
      socket.on("expenses:updated", refreshMonthFromEvent);
      socket.on("deposits:updated", refreshMonthFromEvent);
      socket.on("meal-schedule:updated", (payload: unknown) => {
        if (
          !payload ||
          typeof payload !== "object" ||
          (payload as { messId?: unknown }).messId !== messId ||
          typeof (payload as { date?: unknown }).date !== "string"
        ) {
          return;
        }
        dispatch(invalidateSchedule());
      });
    };
    if (isActive) connect();

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active" && !isActive) connect();
        if (state !== "active") disconnectRealtime();
        isActive = state === "active";
      },
    );

    return () => {
      subscription.remove();
      disconnectRealtime();
    };
  }, [dispatch, token, messId]);

  return <>{children}</>;
};
