import { useEffect, type ReactNode } from "react";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectActiveMess, selectAuthToken } from "@/redux/slice/authSlice";
import {
  formatYearMonth,
  loadMonth,
  selectMessState,
  syncMessScope,
} from "@/redux/slice/messSlice";
import { loadUnreadMessageCount } from "@/redux/slice/messagesSlice";
import { loadUnreadNoticesCount } from "@/redux/slice/noticesSlice";

export const MessStateController = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const token = useAppSelector(selectAuthToken);
  const activeMess = useAppSelector(selectActiveMess);
  const { currentYear, currentMonth } = useAppSelector(selectMessState);
  const yearMonth = formatYearMonth(currentYear, currentMonth);
  const messId = activeMess?.id ?? null;

  useEffect(() => {
    dispatch(syncMessScope(messId));
    if (token && messId) {
      void dispatch(loadMonth({ messId, yearMonth }));
      void dispatch(loadUnreadMessageCount());
      void dispatch(loadUnreadNoticesCount());
    }
  }, [dispatch, token, messId, yearMonth]);

  return <>{children}</>;
};
