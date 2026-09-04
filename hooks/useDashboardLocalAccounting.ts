import { useDeferredValue, useMemo } from "react";

import {
  useDeposits,
  useExpenses,
  useMeals,
  useMess,
} from "@/redux/hooks";
import { calculateDashboardAccounting } from "@/utils/dashboard";

/**
 * Dashboard has no independent API/cache. Its figures are always calculated
 * from the same local-first feature state that powers Meals, Expenses and
 * Deposits. Deferred source values preserve the previous summary for one
 * render while a large local month update is recalculated in the background.
 */
export const useDashboardLocalAccounting = () => {
  const { consumers, currentYearMonth } = useMess();
  const { meals } = useMeals();
  const { expenses } = useExpenses();
  const { deposits } = useDeposits();
  const deferredMeals = useDeferredValue(meals);
  const deferredExpenses = useDeferredValue(expenses);
  const deferredDeposits = useDeferredValue(deposits);

  return useMemo(
    () =>
      calculateDashboardAccounting({
        consumers,
        currentYearMonth,
        appliedRange: null,
        rangeData: {},
        getGrandTotal: (yearMonth) =>
          Object.values(deferredMeals[yearMonth] ?? {}).reduce(
            (total, days) =>
              total + Object.values(days).reduce((sum, value) => sum + value, 0),
            0,
          ),
        getMonthExpenseTotal: (yearMonth) =>
          Object.values(deferredExpenses[yearMonth] ?? {}).reduce(
            (total, day) =>
              total + day.items.reduce((sum, item) => sum + item.amount, 0),
            0,
          ),
        getGrandDepositTotal: (yearMonth) =>
          Object.values(deferredDeposits[yearMonth] ?? {}).reduce(
            (total, days) =>
              total + Object.values(days).reduce((sum, value) => sum + value, 0),
            0,
          ),
        getConsumerTotal: (yearMonth, consumerId) =>
          Object.values(deferredMeals[yearMonth]?.[consumerId] ?? {}).reduce(
            (sum, value) => sum + value,
            0,
          ),
        getConsumerDepositTotal: (yearMonth, consumerId) =>
          Object.values(
            deferredDeposits[yearMonth]?.[consumerId] ?? {},
          ).reduce((sum, value) => sum + value, 0),
      }),
    [
      consumers,
      currentYearMonth,
      deferredMeals,
      deferredExpenses,
      deferredDeposits,
    ],
  );
};
