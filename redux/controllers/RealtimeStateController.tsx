import { AppState, type AppStateStatus } from "react-native";
import { useEffect, type ReactNode } from "react";

import { clearApiCache } from "@/lib/api";
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
      clearApiCache();
      void dispatch(loadUnreadMessageCount());
      void dispatch(loadUnreadNoticesCount());
      void dispatch(loadUnreadBazarAssignmentCount());
      socket.on("bazar-assignment:created", () => {
        clearApiCache();
        void dispatch(loadUnreadBazarAssignmentCount());
      });
      socket.on("notification:created", () => {
        clearApiCache();
        void dispatch(refreshNotifications());
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
