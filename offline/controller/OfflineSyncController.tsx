import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { getLocalAuthSnapshot } from "@/offline/features/reference/storage";
import {
  localAuthSnapshotReceived,
  selectActiveMess,
  selectAuthToken,
  selectAuthUser,
} from "@/redux/slice/authSlice";
import { hydrateConsumersFromLocal } from "@/redux/slice/messSlice";
import { selectNetworkState } from "@/redux/slice/networkSlice";

import { registerBackgroundSyncAsync } from "../background/backgroundSync";
import { useOfflineDatabase } from "../provider/OfflineDatabaseProvider";
import { getOfflineRuntime } from "../runtime/getOfflineRuntime";

export function OfflineSyncController({ children }: { children: ReactNode }) {
  const { database, isAvailable } = useOfflineDatabase();
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const user = useAppSelector(selectAuthUser);
  const activeMess = useAppSelector(selectActiveMess);
  const { isOnline, isCheckingNetwork } = useAppSelector(selectNetworkState);
  const userId = user?.id ?? null;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const syncNow = useCallback(async () => {
    if (
      !database ||
      !token ||
      !userId ||
      !isOnline ||
      isCheckingNetwork ||
      appStateRef.current !== "active"
    ) {
      return;
    }

    const summary = await getOfflineRuntime(database).engine.sync({
      token,
      userId,
      messId: activeMess?.id ?? null,
    });
    if (summary.pulledCollections > 0) {
      const snapshot = await getLocalAuthSnapshot();
      if (snapshot?.me.user.id === userId) {
        dispatch(
          localAuthSnapshotReceived({
            me: snapshot.me,
            activeMess: snapshot.activeMess,
          }),
        );
        await dispatch(hydrateConsumersFromLocal());
      }
    }
  }, [
    activeMess?.id,
    database,
    dispatch,
    isCheckingNetwork,
    isOnline,
    token,
    userId,
  ]);

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
