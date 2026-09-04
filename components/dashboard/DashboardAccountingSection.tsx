import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";
import MonthPicker from "@/components/MonthPicker";
import {
  useAuth,
  useDeposits,
  useExpenses,
  useMeals,
  useMess,
} from "@/redux/hooks";
import { calculateDashboardAccounting } from "@/utils/dashboard";
import { DashboardPersonalSummary } from "./DashboardPersonalSummary";
import { DashboardSummaryCards } from "./DashboardSummaryCards";

export interface DashboardAccountingSectionHandle {
  refresh: () => Promise<void>;
}

export const DashboardAccountingSection = forwardRef<
  DashboardAccountingSectionHandle,
  object
>((_props, ref) => {
  const { user } = useAuth();
  const {
    consumers,
    currentYearMonth,
    currentMonthLoaded,
    dataLoading,
    refreshMonth,
  } = useMess();
  const { meals, getGrandTotal, getConsumerTotal } = useMeals();
  const { expenses, getMonthExpenseTotal } = useExpenses();
  const { deposits, getGrandDepositTotal, getConsumerDepositTotal } =
    useDeposits();
  const refreshAccounting = useCallback(async () => {
    await refreshMonth();
  }, [refreshMonth]);

  useImperativeHandle(ref, () => ({ refresh: refreshAccounting }), [
    refreshAccounting,
  ]);

  // This calculation walks every consumer's monthly data. Do not repeat it
  // for unrelated Redux updates such as connection/banner state changes.
  const accounting = useMemo(
    () =>
      calculateDashboardAccounting({
        consumers,
        currentYearMonth,
        appliedRange: null,
        rangeData: {},
        getGrandTotal,
        getMonthExpenseTotal,
        getGrandDepositTotal,
        getConsumerTotal,
        getConsumerDepositTotal,
      }),
    [
      consumers,
      currentYearMonth,
      meals,
      expenses,
      deposits,
    ],
  );
  const personalConsumer =
    accounting.consumerRows.find((consumer) => consumer.userId === user?.id) ??
    null;

  return (
    <>
      <MonthPicker
        variant="dashboard"
        monthDataLoading={dataLoading}
        showSyncStatus={false}
      />
      <DashboardPersonalSummary
        consumer={personalConsumer}
        isLoading={dataLoading || !currentMonthLoaded}
      />
      <DashboardSummaryCards accounting={accounting} />
    </>
  );
});

DashboardAccountingSection.displayName = "DashboardAccountingSection";
