import { useEffect, type ReactNode } from "react";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectActiveMess, selectAuthToken } from "@/redux/slice/authSlice";
import {
  formatYearMonth,
  hydrateConsumersFromLocal,
  loadMonth,
  selectMessState,
  syncMessScope,
} from "@/redux/slice/messSlice";
import { loadUnreadMessageCount } from "@/redux/slice/messagesSlice";
import { loadUnreadNoticesCount } from "@/redux/slice/noticesSlice";
import { selectNetworkState } from "@/redux/slice/networkSlice";

export const MessStateController = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const activeMess = useAppSelector(selectActiveMess);
  const { isOnline } = useAppSelector(selectNetworkState);
  const { currentYear, currentMonth } = useAppSelector(selectMessState);
  const yearMonth = formatYearMonth(currentYear, currentMonth);
  const messId = activeMess?.id ?? null;

  useEffect(() => {
    dispatch(syncMessScope(messId));
  }, [dispatch, messId]);

  useEffect(() => {
    if (token && messId) {
      // loadMonth hydrates SQLite and dispatches that snapshot before it asks
      // the API for the authoritative month. A second parallel hydration here
      // could otherwise overwrite a newer remote result with stale local data.
      void dispatch(loadMonth({ messId, yearMonth }));
      void dispatch(loadUnreadMessageCount());
      void dispatch(loadUnreadNoticesCount());
    }
  }, [dispatch, isOnline, token, messId, yearMonth]);

  useEffect(() => {
    if (!token || !messId) return;
    void dispatch(hydrateConsumersFromLocal());
  }, [dispatch, token, messId]);

  return <>{children}</>;
};
