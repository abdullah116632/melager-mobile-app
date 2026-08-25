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
  addConsumer as addMessConsumer,
  getDaysInMonth,
  goToFollowingMonth,
  goToPreviousMonth,
  goToSpecificMonth,
  refreshMonth as refreshMessMonth,
  removeConsumer as removeMessConsumer,
  selectMessState,
  setDeposit as setMessDeposit,
  setExpense as setMessExpense,
  setMeal as setMessMeal,
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
import type { AppDispatch, RootState } from "@/redux/store";
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
    resendOtp: (email: string) =>
      unwrapAsyncResult(dispatch(resendOtp(email))),
    logout: () => unwrapAsyncResult(dispatch(logout())),
    deleteAccount: (password: string) =>
      unwrapAsyncResult(dispatch(deleteAccount(password))),
    requestAccountDeletionOtp: () =>
      unwrapAsyncResult(dispatch(requestAccountDeletionOtp())),
    deleteAccountWithOtp: (otp: string) =>
      unwrapAsyncResult(dispatch(deleteAccountWithOtp(otp))),
    createMess: (name: string) =>
      unwrapAsyncResult(dispatch(createMess(name))),
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

  const getMealCount = (
    yearMonth: string,
    consumerId: string,
    day: number,
  ) => state.meals[yearMonth]?.[consumerId]?.[day.toString()] ?? 0;

  const getConsumerTotal = (yearMonth: string, consumerId: string) =>
    Object.values(state.meals[yearMonth]?.[consumerId] ?? {}).reduce(
      (sum, value) => sum + value,
      0,
    );

  const getDayTotal = (yearMonth: string, day: number) =>
    Object.values(state.meals[yearMonth] ?? {}).reduce(
      (sum, consumerDays) => sum + (consumerDays[day.toString()] ?? 0),
      0,
    );

  const getGrandTotal = (yearMonth: string) =>
    state.consumers.reduce(
      (sum, consumer) => sum + getConsumerTotal(yearMonth, consumer.id),
      0,
    );

  const getExpense = (yearMonth: string, day: number) => {
    const items = state.expenses[yearMonth]?.[day.toString()]?.items ?? [];
    return {
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
    };
  };

  const getMonthExpenseTotal = (yearMonth: string) =>
    Object.values(state.expenses[yearMonth] ?? {}).reduce(
      (total, day) =>
        total +
        (day.items ?? []).reduce((sum, item) => sum + item.amount, 0),
      0,
    );

  const getDeposit = (
    yearMonth: string,
    consumerId: string,
    day: number,
  ) => state.deposits[yearMonth]?.[consumerId]?.[day.toString()] ?? 0;

  const getConsumerDepositTotal = (yearMonth: string, consumerId: string) =>
    Object.values(state.deposits[yearMonth]?.[consumerId] ?? {}).reduce(
      (sum, value) => sum + value,
      0,
    );

  const getDayDepositTotal = (yearMonth: string, day: number) =>
    Object.values(state.deposits[yearMonth] ?? {}).reduce(
      (sum, consumerDays) => sum + (consumerDays[day.toString()] ?? 0),
      0,
    );

  const getGrandDepositTotal = (yearMonth: string) =>
    state.consumers.reduce(
      (sum, consumer) =>
        sum + getConsumerDepositTotal(yearMonth, consumer.id),
      0,
    );

  return {
    consumers: state.consumers,
    currentYearMonth,
    currentMonthLabel,
    dataLoading: state.dataLoading,
    requestStatus: state.requestStatus,
    requestError: state.requestError,
    refreshMonth: async () => {
      await unwrapAsyncResult(dispatch(refreshMessMonth()));
    },
    goToPrevMonth: () => dispatch(goToPreviousMonth()),
    goToNextMonth: () => dispatch(goToFollowingMonth()),
    goToMonth: (year: number, month: number) =>
      dispatch(goToSpecificMonth({ year, month })),
    addConsumer: async (
      name: string,
      email: string,
      mobileNumber?: string,
    ) => {
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
      await unwrapAsyncResult(
        dispatch(removeMessConsumer({ id, isOnline })),
      );
    },
    getMealCount,
    setMeal: (
      yearMonth: string,
      consumerId: string,
      day: number,
      count: number,
    ) => {
      void dispatch(
        setMessMeal({ yearMonth, consumerId, day, count, isOnline }),
      );
    },
    getConsumerTotal,
    getDayTotal,
    getGrandTotal,
    getExpense,
    setExpense: async (
      yearMonth: string,
      day: number,
      items: DayExpenseItem[],
    ) => {
      await unwrapAsyncResult(
        dispatch(setMessExpense({ yearMonth, day, items, isOnline })),
      );
    },
    getMonthExpenseTotal,
    getDeposit,
    setDeposit: (
      yearMonth: string,
      consumerId: string,
      day: number,
      amount: number,
    ) => {
      void dispatch(
        setMessDeposit({ yearMonth, consumerId, day, amount, isOnline }),
      );
    },
    getConsumerDepositTotal,
    getDayDepositTotal,
    getGrandDepositTotal,
    getDaysInMonth,
  };
};
