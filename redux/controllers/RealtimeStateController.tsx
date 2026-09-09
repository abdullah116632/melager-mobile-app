import { AppState, type AppStateStatus } from "react-native";
import { useEffect, type ReactNode } from "react";

import {
  clearApiCache,
  invalidateApiCache,
  type ApiServerNotification,
} from "@/lib/api";
import { getOfflineDatabase } from "@/offline/database/connection";
import { MessageRepository } from "@/offline/features/messages/MessageRepository";
import { subscribeToMessageLifecycle } from "@/offline/features/messages/messageLifecycle";
import {
  connectRealtime,
  disconnectRealtime,
  isMessageConversationActive,
  subscribeToRealtimeMessages,
  subscribeToRealtimeReactions,
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
  messageAcknowledged,
  messageReactionChanged,
  messageReceived,
  messageStatusChanged,
  unreadMessageReceived,
} from "@/redux/slice/messagesSlice";
import { loadUnreadNoticesCount } from "@/redux/slice/noticesSlice";
import { loadUnreadBazarAssignmentCount } from "@/redux/slice/bazarNotificationsSlice";
import { loadUnreadConsumerBreakdownCount } from "@/redux/slice/consumerBreakdownNotificationsSlice";
import { loadMonth } from "@/redux/slice/messSlice";
import { loadDepositEntries } from "@/redux/slice/depositsSlice";
import { invalidateSchedule } from "@/redux/slice/mealMenuSlice";
import {
  ingestServerNotification,
  refreshNotifications,
} from "@/redux/slice/notificationSlice";

/**
 * Window used to fold a burst of month events into a single refetch. Short
 * enough that a single edit still feels immediate, long enough to absorb the
 * events several members produce while filling in the same month.
 */
const MONTH_REFRESH_DEBOUNCE_MS = 600;

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
      subscribeToMessageLifecycle((event) => {
        if (event.type === "acknowledged") {
          dispatch(messageAcknowledged(event));
        } else {
          dispatch(messageStatusChanged(event));
        }
      }),
    [dispatch],
  );

  useEffect(
    () =>
      subscribeToRealtimeReactions((change) => {
        if (user?.id)
          void getOfflineDatabase()
            .then((db) =>
              new MessageRepository(db).applyRemoteReaction(
                change.messId,
                change.messageId,
                change.userId,
                change.reaction,
              ),
            )
            .catch(() => undefined);
        dispatch(messageReactionChanged(change));
      }),
    [dispatch, user?.id],
  );

  useEffect(
    () =>
      subscribeToRealtimeMessages((message) => {
        // Every `/mess/messages*` GET is stale once a message arrives, but
        // nothing else is. Clearing the whole response cache here meant a busy
        // conversation kept it permanently empty, so every other screen paid
        // for a fresh round trip on each navigation.
        invalidateApiCache("/mess/messages");
        if (user?.id)
          void getOfflineDatabase()
            .then((db) => new MessageRepository(db).merge(user.id, [message]))
            .catch(() => undefined);
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
    const monthRefreshes = new Map<string, Promise<unknown>>();
    const pendingMonthRefreshes = new Map<
      string,
      { timer: ReturnType<typeof setTimeout>; refreshEntries: boolean }
    >();

    const connect = () => {
      const socket = connectRealtime(token, messId);

      const runMonthRefresh = (
        refreshKey: string,
        yearMonth: string,
        refreshEntries: boolean,
      ) => {
        const previousRefresh =
          monthRefreshes.get(refreshKey) ?? Promise.resolve();
        const nextRefresh = previousRefresh
          .catch(() => undefined)
          .then(() =>
            Promise.all([
              dispatch(loadMonth({ messId, yearMonth, force: true })),
              refreshEntries
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
      };

      /**
       * Coalesces a burst of month events into one refetch.
       *
       * Every member editing a meal cell emits an event to every device, and
       * each one used to queue a full month GET plus a whole-month SQLite
       * merge. They were already serialised, so a busy evening built a long
       * chain of refetches that all produce the same final state. The trailing
       * timer still fires after the last event, so nothing is skipped.
       */
      const scheduleMonthRefresh = (
        refreshKey: string,
        yearMonth: string,
        refreshEntries: boolean,
      ) => {
        const pending = pendingMonthRefreshes.get(refreshKey);
        if (pending) clearTimeout(pending.timer);
        const mergedRefreshEntries =
          refreshEntries || (pending?.refreshEntries ?? false);
        const timer = setTimeout(() => {
          pendingMonthRefreshes.delete(refreshKey);
          runMonthRefresh(refreshKey, yearMonth, mergedRefreshEntries);
        }, MONTH_REFRESH_DEBOUNCE_MS);
        pendingMonthRefreshes.set(refreshKey, {
          timer,
          refreshEntries: mergedRefreshEntries,
        });
      };

      const refreshMonthFromEvent = (payload: unknown) => {
        if (
          !payload ||
          typeof payload !== "object" ||
          typeof (payload as { messId?: unknown }).messId !== "number" ||
          (payload as { messId: number }).messId !== messId
        ) {
          return;
        }
        invalidateApiCache("/mess/data/");
        invalidateApiCache("/mess/deposit-entries");
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
          scheduleMonthRefresh(
            refreshKey,
            yearMonth,
            Boolean(event.refreshEntries),
          );
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
      socket.on("notification:created", (notification: unknown) => {
        clearApiCache();
        void dispatch(
          ingestServerNotification(notification as ApiServerNotification),
        );
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
        clearApiCache();
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
      for (const { timer } of pendingMonthRefreshes.values()) {
        clearTimeout(timer);
      }
      pendingMonthRefreshes.clear();
    };
  }, [dispatch, token, messId]);

  return <>{children}</>;
};
