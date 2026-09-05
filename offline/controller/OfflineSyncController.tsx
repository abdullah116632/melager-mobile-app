import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAppDispatch, useAppSelector, useAppStore } from "@/redux/hooks";
import { getLocalAuthSnapshot } from "@/offline/features/reference/storage";
import {
  localAuthSnapshotReceived,
  selectActiveMess,
  selectAuthToken,
  selectAuthUser,
} from "@/redux/slice/authSlice";
import { hydrateConsumersFromLocal } from "@/redux/slice/messSlice";
import { formatYearMonth } from "@/redux/slice/messSlice";
import { selectNetworkState } from "@/redux/slice/networkSlice";
import { hydrateMessagesFromLocal } from "@/redux/slice/messagesSlice";
import { hydrateDepositEntriesFromLocal } from "@/redux/slice/depositsSlice";
import { hydrateExpenseMonth } from "@/redux/slice/expenseSlice";
import { hydrateDailyMealMonthFromLocal } from "@/redux/slice/mealsSlice";
import { setSchedule } from "@/redux/slice/mealMenuSlice";
import { MealScheduleRepository } from "../features/meals/MealScheduleRepository";

import { registerBackgroundSyncAsync } from "../background/backgroundSync";
import { useOfflineDatabase } from "../provider/OfflineDatabaseProvider";
import { getOfflineRuntime } from "../runtime/getOfflineRuntime";

export function OfflineSyncController({ children }: { children: ReactNode }) {
  const { database, isAvailable } = useOfflineDatabase();
  const dispatch = useAppDispatch();
  const appStore = useAppStore();
  const token = useAppSelector(selectAuthToken);
  const user = useAppSelector(selectAuthUser);
  const activeMess = useAppSelector(selectActiveMess);
  const { isOnline, isCheckingNetwork } = useAppSelector(selectNetworkState);
  const userId = user?.id ?? null;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const hydrateReduxFromLocal = useCallback(async () => {
    if (!database || !userId || appStateRef.current !== "active") return;
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

    const state = appStore.getState();
    const messId = state.auth.activeMess?.id ?? null;
    if (
      messId &&
      state.auth.user?.id === userId &&
      state.auth.activeMess?.id === messId
    ) {
      const currentYearMonth = formatYearMonth(
        state.mess.currentYear,
        state.mess.currentMonth,
      );
      const yearMonths = new Set([
        currentYearMonth,
        ...Object.keys(state.meals.months),
        ...Object.keys(state.expenses.loadedMonths),
        ...Object.keys(state.deposits.loadedEntryMonths),
      ]);
      await Promise.all([
        dispatch(hydrateMessagesFromLocal()),
        ...[...yearMonths].flatMap((yearMonth) => [
          dispatch(hydrateDailyMealMonthFromLocal({ messId, yearMonth })),
          dispatch(hydrateExpenseMonth({ messId, yearMonth })),
          dispatch(hydrateDepositEntriesFromLocal({ messId, yearMonth })),
        ]),
      ]);

      const latestState = appStore.getState();
      if (
        latestState.auth.user?.id === userId &&
        latestState.auth.activeMess?.id === messId
      ) {
        const selectedDate = latestState.mealMenu.selectedDate;
        const localSchedule = await new MealScheduleRepository(
          database,
        ).getSnapshot(userId, messId, selectedDate);
        if (localSchedule) dispatch(setSchedule(localSchedule.schedule));
      }
    }
  }, [appStore, database, dispatch, userId]);

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
    if (
      summary.pushed > 0 ||
      summary.pulledCollections > 0 ||
      summary.failed > 0
    ) {
      await hydrateReduxFromLocal();
    }
  }, [
    activeMess?.id,
    database,
    hydrateReduxFromLocal,
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
    void hydrateReduxFromLocal()
      .then(syncNow)
      .catch(() => undefined);
  }, [hydrateReduxFromLocal, syncNow]);

  useEffect(() => {
    if (!database || !userId) return;
    const engine = getOfflineRuntime(database).engine;
    const context = { userId, messId: activeMess?.id ?? null };
    return () => engine.cancelScheduled(context);
  }, [activeMess?.id, database, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active") {
        void hydrateReduxFromLocal()
          .then(syncNow)
          .catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [hydrateReduxFromLocal, syncNow]);

  return <>{children}</>;
}
