import { useDispatch, useSelector } from "react-redux";

import {
  createMess,
  deleteAccount,
  deleteAccountWithOtp,
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
  setDeposit as setDepositAction,
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
  offlineActionFailed,
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
import type { AppDispatch, RootState } from "@/redux/store";
import type { DepositEntryInput } from "@/types/deposit";
import type { DayExpenseItem } from "@/types/mess";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

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
    lastLiveSyncAt: state.lastLiveSyncAt,
    lastRefreshError: state.lastRefreshError,
    refreshMonth: async () => {
      if (!isOnline) {
        dispatch(offlineActionFailed("refresh"));
        throw new Error("No internet connection.");
      }
      await unwrapAsyncResult(dispatch(refreshMessMonth()));
    },
    refreshConsumers: async () => {
      if (!isOnline) {
        dispatch(offlineActionFailed("refresh"));
        throw new Error("No internet connection.");
      }
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
      if (!isOnline) {
        dispatch(offlineActionFailed("entry"));
        throw new Error("No internet connection.");
      }
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
      if (!isOnline) {
        dispatch(offlineActionFailed("update"));
        throw new Error("No internet connection.");
      }
      await unwrapAsyncResult(dispatch(removeMessConsumer({ id, isOnline })));
    },
    getDaysInMonth,
  };
};

export const useMeals = () => {
  const dispatch = useAppDispatch();
  const shared = useMess();
  const { isOnline } = useAppSelector(selectNetworkState);
  const state = useAppSelector(selectMealsState);

  const getMealCount = (yearMonth: string, consumerId: string, day: number) =>
    state.months[yearMonth]?.[consumerId]?.[day.toString()] ?? 0;

  const getConsumerTotal = (yearMonth: string, consumerId: string) =>
    Object.values(state.months[yearMonth]?.[consumerId] ?? {}).reduce(
      (sum, value) => sum + value,
      0,
    );

  const getDayTotal = (yearMonth: string, day: number) =>
    Object.values(state.months[yearMonth] ?? {}).reduce(
      (sum, consumerDays) => sum + (consumerDays[day.toString()] ?? 0),
      0,
    );

  const getGrandTotal = (yearMonth: string) =>
    shared.consumers.reduce(
      (sum, consumer) => sum + getConsumerTotal(yearMonth, consumer.id),
      0,
    );

  return {
    ...shared,
    meals: state.months,
    getMealCount,
    getConsumerTotal,
    getDayTotal,
    getGrandTotal,
    setMeal: (
      yearMonth: string,
      consumerId: string,
      day: number,
      count: number,
    ) => {
      if (!isOnline) {
        dispatch(offlineActionFailed("entry"));
        return;
      }
      void dispatch(
        setMealAction({ yearMonth, consumerId, day, count, isOnline }),
      );
    },
  };
};

export const useExpenses = () => {
  const dispatch = useAppDispatch();
  const shared = useMess();
  const { isOnline } = useAppSelector(selectNetworkState);
  const state = useAppSelector(selectExpenseState);

  const getExpense = (yearMonth: string, day: number) => {
    const items = state.months[yearMonth]?.[day.toString()]?.items ?? [];
    return {
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
    };
  };

  const getMonthExpenseTotal = (yearMonth: string) =>
    Object.values(state.months[yearMonth] ?? {}).reduce(
      (total, day) =>
        total + (day.items ?? []).reduce((sum, item) => sum + item.amount, 0),
      0,
    );

  return {
    ...shared,
    expenses: state.months,
    expenseRequestStatus: state.requestStatus,
    expenseRequestError: state.requestError,
    getExpense,
    getMonthExpenseTotal,
    setExpense: async (
      yearMonth: string,
      day: number,
      items: DayExpenseItem[],
    ) => {
      if (!isOnline) {
        dispatch(offlineActionFailed("entry"));
        throw new Error("No internet connection.");
      }
      await unwrapAsyncResult(
        dispatch(setExpenseAction({ yearMonth, day, items, isOnline })),
      );
    },
  };
};

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
    entries: state.entriesByMonth[yearMonth] ?? [],
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
    setDeposit: (
      selectedYearMonth: string,
      consumerId: string,
      day: number,
      amount: number,
    ) => {
      if (!isOnline) {
        dispatch(offlineActionFailed("entry"));
        return;
      }
      void dispatch(
        setDepositAction({
          yearMonth: selectedYearMonth,
          consumerId,
          day,
          amount,
          isOnline,
        }),
      );
    },
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
      if (!isOnline) {
        dispatch(offlineActionFailed("entry"));
        throw new Error("No internet connection.");
      }
      return unwrapAsyncResult(
        dispatch(addDepositEntryAction({ yearMonth, data })),
      );
    },
    updateEntry: async (
      entryId: number,
      data: Omit<DepositEntryInput, "consumerId">,
    ) => {
      if (!isOnline) {
        dispatch(offlineActionFailed("update"));
        throw new Error("No internet connection.");
      }
      return unwrapAsyncResult(
        dispatch(updateDepositEntryAction({ yearMonth, entryId, data })),
      );
    },
    deleteEntry: async (entryId: number) => {
      if (!isOnline) {
        dispatch(offlineActionFailed("update"));
        throw new Error("No internet connection.");
      }
      return unwrapAsyncResult(
        dispatch(deleteDepositEntryAction({ yearMonth, entryId })),
      );
    },
  };
};
