import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAppSelector } from "@/redux/hooks";
import {
  selectActiveMess,
  selectAuthToken,
  selectAuthUser,
} from "@/redux/slice/authSlice";
import { selectNetworkState } from "@/redux/slice/networkSlice";

import { registerBackgroundSyncAsync } from "../background/backgroundSync";
import { useOfflineDatabase } from "../provider/OfflineDatabaseProvider";
import { getOfflineRuntime } from "../runtime/getOfflineRuntime";

export function OfflineSyncController({ children }: { children: ReactNode }) {
  const { database, isAvailable } = useOfflineDatabase();
  const token = useAppSelector(selectAuthToken);
  const user = useAppSelector(selectAuthUser);
  const activeMess = useAppSelector(selectActiveMess);
  const { isOnline, isCheckingNetwork } = useAppSelector(selectNetworkState);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const syncNow = useCallback(async () => {
    if (
      !database ||
      !token ||
      !user ||
      !isOnline ||
      isCheckingNetwork ||
      appStateRef.current !== "active"
    ) {
      return;
    }

    await getOfflineRuntime(database).engine.sync({
      token,
      userId: user.id,
      messId: activeMess?.id ?? null,
    });
  }, [activeMess?.id, database, isCheckingNetwork, isOnline, token, user]);

  useEffect(() => {
    if (!isAvailable) return;
    void registerBackgroundSyncAsync().catch(() => undefined);
  }, [isAvailable]);

  useEffect(() => {
    void syncNow().catch(() => undefined);
  }, [syncNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active") void syncNow().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [syncNow]);

  return <>{children}</>;
}
