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
import {
  offlineQueueSizeChanged,
  selectNetworkState,
} from "@/redux/slice/networkSlice";
import { hydrateMessagesFromLocal } from "@/redux/slice/messagesSlice";
import { hydrateDepositEntriesFromLocal } from "@/redux/slice/depositsSlice";
import { hydrateExpenseMonth } from "@/redux/slice/expenseSlice";
import { hydrateDailyMealMonthFromLocal } from "@/redux/slice/mealsSlice";
import { setSchedule } from "@/redux/slice/mealMenuSlice";
import { MealScheduleRepository } from "../features/meals/MealScheduleRepository";

import { registerBackgroundSyncAsync } from "../background/backgroundSync";
import { useOfflineDatabase } from "../provider/OfflineDatabaseProvider";
import { getOfflineRuntime } from "../runtime/getOfflineRuntime";
import { setManualSyncHandler } from "../runtime/manualSync";
import { subscribeToOutboxChanges } from "../outbox/outboxChangeNotifier";

/**
 * How long a queued operation must survive before it counts as a backlog.
 *
 * An online edit also lands in the outbox, and is normally pushed and deleted
 * within a few hundred milliseconds. Reporting that transient row would flash
 * the sync banner on every single edit, so only work that is still queued after
 * this window is worth telling the user about. Bursts of writes collapse into a
 * single COUNT for the same reason.
 */
const OUTBOX_RECOUNT_DEBOUNCE_MS = 2000;

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

  // `network.pendingCount` drives the offline banner. Its old source was the
  // retired AsyncStorage queue, which always reported zero, so the banner could
  // never tell the user that queued work was still waiting.
  useEffect(() => {
    if (!database || !userId) {
      dispatch(offlineQueueSizeChanged(0));
      return;
    }
    let cancelled = false;
    let recountTimer: ReturnType<typeof setTimeout> | null = null;
    const outbox = getOfflineRuntime(database).outbox;
    const messId = activeMess?.id ?? null;

    const publishPendingCount = () => {
      void outbox
        .countPending(userId, messId)
        .then((count) => {
          if (!cancelled) dispatch(offlineQueueSizeChanged(count));
        })
        .catch(() => undefined);
    };

    const scheduleRecount = () => {
      if (recountTimer) clearTimeout(recountTimer);
      recountTimer = setTimeout(() => {
        recountTimer = null;
        publishPendingCount();
      }, OUTBOX_RECOUNT_DEBOUNCE_MS);
    };

    publishPendingCount();
    const unsubscribe = subscribeToOutboxChanges(scheduleRecount);
    return () => {
      cancelled = true;
      if (recountTimer) clearTimeout(recountTimer);
      unsubscribe();
    };
  }, [activeMess?.id, database, dispatch, userId]);

  useEffect(() => setManualSyncHandler(syncNow), [syncNow]);

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
