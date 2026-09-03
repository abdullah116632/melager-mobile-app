import { AppState, type AppStateStatus } from "react-native";
import { useEffect, type ReactNode } from "react";

import { connectRealtime, disconnectRealtime } from "@/lib/realtime";
import { useAppSelector } from "@/redux/hooks";
import { selectActiveMess, selectAuthToken } from "@/redux/slice/authSlice";

/** Keeps a single authenticated, active-mess Socket.IO connection alive. */
export const RealtimeStateController = ({ children }: { children: ReactNode }) => {
  const token = useAppSelector(selectAuthToken);
  const activeMess = useAppSelector(selectActiveMess);
  const messId = activeMess?.id ?? null;

  useEffect(() => {
    if (!token || !messId) {
      disconnectRealtime();
      return;
    }

    let isActive = AppState.currentState === "active";
    if (isActive) connectRealtime(token, messId);

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active" && !isActive) connectRealtime(token, messId);
        if (state !== "active") disconnectRealtime();
        isActive = state === "active";
      },
    );

    return () => {
      subscription.remove();
      disconnectRealtime();
    };
  }, [token, messId]);

  return <>{children}</>;
};
