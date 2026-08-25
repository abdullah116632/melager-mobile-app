import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Alert } from "react-native";
import { useAuth } from "@/redux/hooks";
import { useMess } from "@/redux/hooks";
import { getDashboardRangeData } from "@/services/dashboardService";
import type { DashboardDateRange, MonthData } from "@/types/dashboard";
import {
  calculateDashboardAccounting,
  getDefaultDashboardRange,
} from "@/utils/dashboard";
import { DashboardConsumerBreakdown } from "./DashboardConsumerBreakdown";
import { DashboardSummaryCards } from "./DashboardSummaryCards";

export interface DashboardAccountingSectionHandle {
  refresh: () => Promise<void>;
}

export const DashboardAccountingSection = forwardRef<
  DashboardAccountingSectionHandle,
  object
>((_props, ref) => {
  const { mess, token } = useAuth();
  const {
    consumers,
    currentYearMonth,
    getGrandTotal,
    getMonthExpenseTotal,
    getGrandDepositTotal,
    getConsumerTotal,
    getConsumerDepositTotal,
    refreshMonth,
  } = useMess();
  const defaultRange = getDefaultDashboardRange(currentYearMonth);
  const [draftStartDate, setDraftStartDate] = useState(defaultRange.startDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultRange.endDate);
  const [appliedRange, setAppliedRange] = useState<DashboardDateRange | null>(
    null,
  );
  const [rangeData, setRangeData] = useState<Record<string, MonthData>>({});
  const [rangeLoading, setRangeLoading] = useState(false);

  useEffect(() => {
    const nextRange = getDefaultDashboardRange(currentYearMonth);
    setDraftStartDate(nextRange.startDate);
    setDraftEndDate(nextRange.endDate);
    setAppliedRange(null);
    setRangeData({});
  }, [currentYearMonth, mess?.id]);

  const fetchRange = useCallback(
    async (startDate: string, endDate: string) => {
      if (!token || !mess) return null;
      return getDashboardRangeData(mess.id, token, startDate, endDate);
    },
    [token, mess?.id],
  );

  const applyDateRange = async () => {
    if (draftEndDate <= draftStartDate) {
      Alert.alert(
        "Invalid Date Range",
        "End date must be later than start date.",
      );
      return;
    }
    setRangeLoading(true);
    try {
      const data = await fetchRange(draftStartDate, draftEndDate);
      if (!data) return;
      setRangeData(data);
      setAppliedRange({
        startDate: draftStartDate,
        endDate: draftEndDate,
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Could not load the selected date range.",
      );
    } finally {
      setRangeLoading(false);
    }
  };

  const refreshAccounting = useCallback(async () => {
    await refreshMonth();
    const refreshedRange = appliedRange
      ? await fetchRange(appliedRange.startDate, appliedRange.endDate)
      : null;
    if (refreshedRange) setRangeData(refreshedRange);
  }, [refreshMonth, appliedRange, fetchRange]);

  useImperativeHandle(ref, () => ({ refresh: refreshAccounting }), [
    refreshAccounting,
  ]);

  const accounting = calculateDashboardAccounting({
    consumers,
    currentYearMonth,
    appliedRange,
    rangeData,
    getGrandTotal,
    getMonthExpenseTotal,
    getGrandDepositTotal,
    getConsumerTotal,
    getConsumerDepositTotal,
  });

  return (
    <>
      <DashboardSummaryCards accounting={accounting} />
      <DashboardConsumerBreakdown
        accounting={accounting}
        appliedRange={appliedRange}
        draftStartDate={draftStartDate}
        draftEndDate={draftEndDate}
        rangeLoading={rangeLoading}
        onStartDateChange={setDraftStartDate}
        onEndDateChange={setDraftEndDate}
        onApplyRange={() => void applyDateRange()}
      />
    </>
  );
});

DashboardAccountingSection.displayName = "DashboardAccountingSection";
