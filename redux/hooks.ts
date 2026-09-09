import { useCallback, useMemo } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import {
  createMess,
  deleteAccount,
  deleteAccountWithOtp,
  deleteMess,
  deleteMessWithGoogle,
  exitMess,
  joinMess,
  login,
  loginWithGoogle,
  logout,
  patchActiveMess,
  patchMess,
  patchUser,
  refreshMe,
  requestAccountDeletionOtp,
  resendOtp,
  retryJoin,
  selectAuthState,
  selectMess,
  signup,
  updateMessName,
  updatePhone,
  updateProfileName,
  verifyOtp,
} from "@/redux/slice/authSlice";
import {
  closeDrawer,
  openDrawer,
  selectDrawerIsOpen,
} from "@/redux/slice/drawerSlice";
import {
  addDepositEntry as addDepositEntryAction,
  deleteDepositEntry as deleteDepositEntryAction,
  loadDepositEntries,
  selectDepositsState,
  updateDepositEntry as updateDepositEntryAction,
} from "@/redux/slice/depositsSlice";
import {
  selectExpenseState,
  setExpense as setExpenseAction,
} from "@/redux/slice/expenseSlice";
import {
  selectMealsState,
  setMeal as setMealAction,
} from "@/redux/slice/mealsSlice";
import {
  addConsumer as addMessConsumer,
  getDaysInMonth,
  goToFollowingMonth,
  goToPreviousMonth,
  goToSpecificMonth,
  loadMonth as loadMessMonth,
  refreshMonth as refreshMessMonth,
  refreshConsumers as refreshMessConsumers,
  removeConsumer as removeMessConsumer,
  selectMessState,
  formatYearMonth,
} from "@/redux/slice/messSlice";
import {
  selectNetworkState,
  syncOfflineQueue,
} from "@/redux/slice/networkSlice";
import {
  closeNotificationPanel,
  markAllNotificationsRead,
  markNotificationRead,
  openNotificationPanel,
  refreshNotifications,
  selectNotificationState,
} from "@/redux/slice/notificationSlice";
import type { AppDispatch, AppStore, RootState } from "@/redux/store";
import type { DepositEntry, DepositEntryInput } from "@/types/deposit";
import type { DayExpenseItem } from "@/types/mess";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();

type UnwrappableResult<Result> = {
  unwrap: () => Promise<Result>;
};

const unwrapAsyncResult = async <Result>(
  result: UnwrappableResult<Result>,
): Promise<Result> => {
  try {
    return await result.unwrap();
  } catch (caughtError) {
    if (caughtError instanceof Error) throw caughtError;
    if (
      caughtError &&
      typeof caughtError === "object" &&
      "message" in caughtError &&
      typeof caughtError.message === "string"
    ) {
      throw new Error(caughtError.message);
    }
    throw caughtError;
  }
};

// A Redux-backed migration adapter for auth consumers. It preserves the old
// async method contract while all state now comes directly from the auth slice.
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectAuthState);
  const mess = state.activeMess
    ? {
        id: state.activeMess.id,
        name: state.activeMess.name,
        messKey: state.activeMess.messKey,
      }
    : null;

  return {
    ...state,
    mess,
    role: state.activeMess?.role ?? null,
    consumerId: null,
    pendingRequest: null,
    login: (email: string, password: string) =>
      unwrapAsyncResult(dispatch(login({ email, password }))),
    loginWithGoogle: (idToken: string) =>
      unwrapAsyncResult(dispatch(loginWithGoogle(idToken))),
    signup: (
      email: string,
      name: string,
      password: string,
      mobileNumber: string,
    ) =>
      unwrapAsyncResult(
        dispatch(signup({ email, name, password, mobileNumber })),
      ),
    verifyOtp: (email: string, otp: string) =>
      unwrapAsyncResult(dispatch(verifyOtp({ email, otp }))),
    resendOtp: (email: string) => unwrapAsyncResult(dispatch(resendOtp(email))),
    logout: () => unwrapAsyncResult(dispatch(logout())),
    deleteAccount: (password: string) =>
      unwrapAsyncResult(dispatch(deleteAccount(password))),
    requestAccountDeletionOtp: () =>
      unwrapAsyncResult(dispatch(requestAccountDeletionOtp())),
    deleteAccountWithOtp: (otp: string) =>
      unwrapAsyncResult(dispatch(deleteAccountWithOtp(otp))),
    createMess: (name: string) => unwrapAsyncResult(dispatch(createMess(name))),
    joinMess: (messKey: string) =>
      unwrapAsyncResult(dispatch(joinMess(messKey))),
    retryJoin: (requestId: number) =>
      unwrapAsyncResult(dispatch(retryJoin(requestId))),
    refreshMe: () => unwrapAsyncResult(dispatch(refreshMe())),
    selectMess: (selectedMess: Parameters<typeof selectMess>[0]) =>
      dispatch(selectMess(selectedMess)),
    exitMess: () => dispatch(exitMess()),
    patchUser: (update: Parameters<typeof patchUser>[0]) =>
      dispatch(patchUser(update)),
    patchActiveMess: (update: Parameters<typeof patchActiveMess>[0]) =>
      dispatch(patchActiveMess(update)),
    patchMess: (update: Parameters<typeof patchMess>[0]) =>
      dispatch(patchMess(update)),
    updateProfileName: (name: string) =>
      unwrapAsyncResult(dispatch(updateProfileName(name))),
    updatePhone: (phone: string | null) =>
      unwrapAsyncResult(dispatch(updatePhone(phone))),
    updateMessName: (name: string) =>
      unwrapAsyncResult(dispatch(updateMessName(name))),
    deleteMess: (password: string) =>
      unwrapAsyncResult(dispatch(deleteMess(password))),
    deleteMessWithGoogle: (googleIdToken: string) =>
      unwrapAsyncResult(dispatch(deleteMessWithGoogle(googleIdToken))),
  };
};

export const useDrawer = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectDrawerIsOpen);

  return {
    isOpen,
    openDrawer: () => dispatch(openDrawer()),
    closeDrawer: () => dispatch(closeDrawer()),
  };
};

export const useNetwork = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectNetworkState);

  return {
    ...state,
    syncNow: async () => {
      await unwrapAsyncResult(dispatch(syncOfflineQueue()));
    },
  };
};

export const useNotifications = () => {
  const dispatch = useAppDispatch();
  const state = useAppSelector(selectNotificationState);

  return {
    pendingRequestCount: state.pendingRequestCount,
    notifications: state.notifications,
    unreadCount: state.notifications.filter(
      (notification) => !notification.read,
    ).length,
    refreshCount: async () => {
      await unwrapAsyncResult(dispatch(refreshNotifications()));
    },
    markAllRead: () => dispatch(markAllNotificationsRead()),
    markRead: (id: string) => dispatch(markNotificationRead(id)),
    panelVisible: state.panelVisible,
    openPanel: () => dispatch(openNotificationPanel()),
    closePanel: () => dispatch(closeNotificationPanel()),
  };
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const useMess = () => {
  const dispatch = useAppDispatch();
  const { isOnline } = useNetwork();
  const state = useAppSelector(selectMessState);
  const currentYearMonth = formatYearMonth(
    state.currentYear,
    state.currentMonth,
  );
  const currentMonthLabel = `${MONTH_NAMES[state.currentMonth - 1]} ${state.currentYear}`;
  const currentMonthLoaded =
    state.scopeMessId !== null &&
    Boolean(state.loadedMonths[`${state.scopeMessId}:${currentYearMonth}`]);

  return {
    consumers: state.consumers,
    currentYearMonth,
    currentMonthLabel,
    currentMonthLoaded,
    dataLoading: state.dataLoading,
    requestStatus: state.requestStatus,
    requestError: state.requestError,
    dataSource: state.dataSource,
    consumerDataSource: state.consumerDataSource,
    consumersLastSyncAt: state.consumersLastSyncAt,
    lastLiveSyncAt: state.lastLiveSyncAt,
    lastRefreshError: state.lastRefreshError,
    refreshMonth: async () => {
      await unwrapAsyncResult(dispatch(refreshMessMonth()));
    },
    refreshConsumers: async () => {
      await unwrapAsyncResult(dispatch(refreshMessConsumers()));
    },
    goToPrevMonth: () => dispatch(goToPreviousMonth()),
    goToNextMonth: () => dispatch(goToFollowingMonth()),
    goToMonth: async (year: number, month: number) => {
      const yearMonth = formatYearMonth(year, month);
      dispatch(goToSpecificMonth({ year, month }));
      if (state.scopeMessId === null) return;
      await unwrapAsyncResult(
        dispatch(loadMessMonth({ messId: state.scopeMessId, yearMonth })),
      );
    },
    addConsumer: async (name: string, email: string, mobileNumber?: string) => {
      const result = await unwrapAsyncResult(
        dispatch(
          addMessConsumer({
            name,
            email,
            mobileNumber,
            isOnline,
          }),
        ),
      );
      return { invitationSent: result.invitationSent };
    },
    removeConsumer: async (id: string) => {
      await unwrapAsyncResult(dispatch(removeMessConsumer({ id, isOnline })));
    },
    getDaysInMonth,
  };
};

interface MonthMealTotals {
  byConsumer: Record<string, number>;
  byDay: Record<string, number>;
}

/**
 * Sums a month once, per consumer and per day.
 *
 * The meal grid asks for one consumer total per row and one day total per
 * footer cell. Each of those used to re-reduce the same rows, so a 20 x 31
 * grid walked the month roughly forty times and allocated an array per call.
 */
const computeMonthMealTotals = (
  month: Record<string, Record<string, number>> | undefined,
): MonthMealTotals => {
  const byConsumer: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  for (const [consumerId, days] of Object.entries(month ?? {})) {
    let consumerTotal = 0;
    for (const [day, value] of Object.entries(days)) {
      consumerTotal += value;
      byDay[day] = (byDay[day] ?? 0) + value;
    }
    byConsumer[consumerId] = consumerTotal;
  }
  return { byConsumer, byDay };
};

export const useMeals = () => {
  const dispatch = useAppDispatch();
  const shared = useMess();
  const { isOnline } = useAppSelector(selectNetworkState);
  const state = useAppSelector(selectMealsState);
  const months = state.months;
  const { consumers } = shared;

  // Immer gives `months` a new identity on every meal write, so a cache keyed
  // to that identity can never serve a stale total.
  const totalsByMonth = useMemo(
    () => new Map<string, MonthMealTotals>(),
    [months],
  );
  const getMonthTotals = useCallback(
    (yearMonth: string): MonthMealTotals => {
      const cached = totalsByMonth.get(yearMonth);
      if (cached) return cached;
      const totals = computeMonthMealTotals(months[yearMonth]);
      totalsByMonth.set(yearMonth, totals);
      return totals;
    },
    [months, totalsByMonth],
  );

  const getMealCount = useCallback(
    (yearMonth: string, consumerId: string, day: number) =>
      months[yearMonth]?.[consumerId]?.[day.toString()] ?? 0,
    [months],
  );

  const getConsumerTotal = useCallback(
    (yearMonth: string, consumerId: string) =>
      getMonthTotals(yearMonth).byConsumer[consumerId] ?? 0,
    [getMonthTotals],
  );

  const getDayTotal = useCallback(
    (yearMonth: string, day: number) =>
      getMonthTotals(yearMonth).byDay[day.toString()] ?? 0,
    [getMonthTotals],
  );

  // Still driven by the current consumer list, not by whatever consumer ids
  // the month happens to contain, so a removed member stays excluded.
  const getGrandTotal = useCallback(
    (yearMonth: string) => {
      const { byConsumer } = getMonthTotals(yearMonth);
      return consumers.reduce(
        (sum, consumer) => sum + (byConsumer[consumer.id] ?? 0),
        0,
      );
    },
    [consumers, getMonthTotals],
  );

  const setMeal = useCallback(
    (yearMonth: string, consumerId: string, day: number, count: number) => {
      void dispatch(
        setMealAction({ yearMonth, consumerId, day, count, isOnline }),
      );
    },
    [dispatch, isOnline],
  );

  return {
    ...shared,
    meals: months,
    getMealCount,
    getConsumerTotal,
    getDayTotal,
    getGrandTotal,
    setMeal,
  };
};

interface DayExpenseSummary {
  items: DayExpenseItem[];
  conflictMessage: string | null;
  total: number;
}

interface MonthExpenseSummary {
  byDay: Record<string, DayExpenseSummary>;
  monthTotal: number;
}

/** Shared so a day with no expenses keeps the same identity between renders. */
const EMPTY_DAY_EXPENSE: DayExpenseSummary = {
  items: [],
  conflictMessage: null,
  total: 0,
};

/**
 * Sums a month once, per day and overall.
 *
 * The expense table asks for a day's total on every row, again while counting
 * recorded days, and once more for the month — each of which used to re-reduce
 * the same items and hand back a freshly built object, so nothing downstream
 * could be memoised on it.
 */
const computeMonthExpenses = (
  month:
    | Record<
        string,
        { items?: DayExpenseItem[]; conflictMessage?: string | null }
      >
    | undefined,
): MonthExpenseSummary => {
  const byDay: Record<string, DayExpenseSummary> = {};
  let monthTotal = 0;
  for (const [day, value] of Object.entries(month ?? {})) {
    const items = value.items ?? [];
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    byDay[day] = {
      items,
      conflictMessage: value.conflictMessage ?? null,
      total,
    };
    monthTotal += total;
  }
  return { byDay, monthTotal };
};

export const useExpenses = () => {
  const dispatch = useAppDispatch();
  const shared = useMess();
  const { isOnline } = useAppSelector(selectNetworkState);
  const state = useAppSelector(selectExpenseState);
  const months = state.months;

  // Immer gives `months` a new identity on every expense write, so a cache
  // keyed to that identity can never serve a stale total.
  const summaryByMonth = useMemo(
    () => new Map<string, MonthExpenseSummary>(),
    [months],
  );
  const getMonthSummary = useCallback(
    (yearMonth: string): MonthExpenseSummary => {
      const cached = summaryByMonth.get(yearMonth);
      if (cached) return cached;
      const summary = computeMonthExpenses(months[yearMonth]);
      summaryByMonth.set(yearMonth, summary);
      return summary;
    },
    [months, summaryByMonth],
  );

  const getExpense = useCallback(
    (yearMonth: string, day: number): DayExpenseSummary =>
      getMonthSummary(yearMonth).byDay[day.toString()] ?? EMPTY_DAY_EXPENSE,
    [getMonthSummary],
  );

  const getMonthExpenseTotal = useCallback(
    (yearMonth: string) => getMonthSummary(yearMonth).monthTotal,
    [getMonthSummary],
  );

  const setExpense = useCallback(
    async (yearMonth: string, day: number, items: DayExpenseItem[]) => {
      await unwrapAsyncResult(
        dispatch(setExpenseAction({ yearMonth, day, items, isOnline })),
      );
    },
    [dispatch, isOnline],
  );

  return {
    ...shared,
    currentMonthLoaded:
      Boolean(state.loadedMonths[shared.currentYearMonth]) ||
      shared.currentMonthLoaded,
    dataLoading:
      !state.loadedMonths[shared.currentYearMonth] && shared.dataLoading,
    expenses: months,
    expenseRequestStatus: state.requestStatus,
    expenseRequestError: state.requestError,
    getExpense,
    getMonthExpenseTotal,
    setExpense,
  };
};

/** Shared so a month with no entries keeps the same array between renders. */
const NO_DEPOSIT_ENTRIES: DepositEntry[] = [];

export const useDeposits = () => {
  const dispatch = useAppDispatch();
  const shared = useMess();
  const { isOnline } = useAppSelector(selectNetworkState);
  const state = useAppSelector(selectDepositsState);
  const yearMonth = shared.currentYearMonth;

  const getDeposit = (
    selectedYearMonth: string,
    consumerId: string,
    day: number,
  ) => state.months[selectedYearMonth]?.[consumerId]?.[day.toString()] ?? 0;

  const getConsumerDepositTotal = (
    selectedYearMonth: string,
    consumerId: string,
  ) =>
    Object.values(state.months[selectedYearMonth]?.[consumerId] ?? {}).reduce(
      (sum, value) => sum + value,
      0,
    );

  const getDayDepositTotal = (selectedYearMonth: string, day: number) =>
    Object.values(state.months[selectedYearMonth] ?? {}).reduce(
      (sum, consumerDays) => sum + (consumerDays[day.toString()] ?? 0),
      0,
    );

  const getGrandDepositTotal = (selectedYearMonth: string) =>
    shared.consumers.reduce(
      (sum, consumer) =>
        sum + getConsumerDepositTotal(selectedYearMonth, consumer.id),
      0,
    );

  return {
    ...shared,
    depositsScopeMessId: state.scopeMessId,
    deposits: state.months,
    entries: state.entriesByMonth[yearMonth] ?? NO_DEPOSIT_ENTRIES,
    entriesLoaded: Boolean(state.loadedEntryMonths[yearMonth]),
    entriesLoading: Boolean(state.loadingEntryMonths[yearMonth]),
    entriesError: state.entryErrors[yearMonth] ?? "",
    entriesReady:
      shared.currentMonthLoaded &&
      !shared.dataLoading &&
      Boolean(state.loadedEntryMonths[yearMonth]),
    getDeposit,
    getConsumerDepositTotal,
    getDayDepositTotal,
    getGrandDepositTotal,
    loadEntries: async (force = false) => {
      if (state.scopeMessId === null) {
        throw new Error("Please select a mess and sign in again.");
      }
      await unwrapAsyncResult(
        dispatch(
          loadDepositEntries({
            messId: state.scopeMessId,
            yearMonth,
            force,
          }),
        ),
      );
    },
    addEntry: async (data: DepositEntryInput) => {
      return unwrapAsyncResult(
        dispatch(addDepositEntryAction({ yearMonth, data })),
      );
    },
    updateEntry: async (
      entryId: number,
      data: Omit<DepositEntryInput, "consumerId">,
    ) => {
      return unwrapAsyncResult(
        dispatch(updateDepositEntryAction({ yearMonth, entryId, data })),
      );
    },
    deleteEntry: async (entryId: number) => {
      return unwrapAsyncResult(
        dispatch(deleteDepositEntryAction({ yearMonth, entryId })),
      );
    },
  };
};
