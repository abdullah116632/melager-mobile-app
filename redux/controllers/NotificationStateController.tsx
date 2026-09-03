import { useEffect, type ReactNode } from "react";
import { AppState } from "react-native";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectActiveMess, selectAuthToken } from "@/redux/slice/authSlice";
import {
  getNotificationScopeKey,
  refreshNotifications,
  syncNotificationScope,
} from "@/redux/slice/notificationSlice";

export const NotificationStateController = ({
  children,
}: {
  children: ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const activeMess = useAppSelector(selectActiveMess);
  const scopeKey =
    token && activeMess
      ? getNotificationScopeKey(token, activeMess.id)
      : null;

  useEffect(() => {
    dispatch(syncNotificationScope(scopeKey));
    if (!scopeKey) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const startPolling = () => {
      stopPolling();
      void dispatch(refreshNotifications());
      interval = setInterval(() => {
        void dispatch(refreshNotifications());
      }, 60_000);
    };

    if (AppState.currentState === "active") startPolling();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") startPolling();
      else stopPolling();
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [dispatch, scopeKey]);

  return <>{children}</>;
};
