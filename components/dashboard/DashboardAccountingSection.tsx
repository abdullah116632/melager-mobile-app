import { forwardRef, useCallback, useImperativeHandle } from "react";
import MonthPicker from "@/components/MonthPicker";
import { useAuth, useMess } from "@/redux/hooks";
import { useDashboardLocalAccounting } from "@/hooks/useDashboardLocalAccounting";
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
    currentYearMonth,
    currentMonthLoaded,
    dataLoading,
    refreshMonth,
  } = useMess();
  const refreshAccounting = useCallback(async () => {
    await refreshMonth();
  }, [refreshMonth]);

  useImperativeHandle(ref, () => ({ refresh: refreshAccounting }), [
    refreshAccounting,
  ]);

  const accounting = useDashboardLocalAccounting();
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
