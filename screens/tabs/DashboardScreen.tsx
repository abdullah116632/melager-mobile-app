import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardConsumerBreakdown } from "@/components/dashboard/DashboardConsumerBreakdown";
import { DashboardDatePicker } from "@/components/dashboard/DashboardDatePicker";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardMealSection } from "@/components/dashboard/DashboardMealSection";
import { dashboardStyles as styles } from "@/components/dashboard/dashboardStyles";
import { DashboardSummaryButton } from "@/components/dashboard/DashboardSummaryButton";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";
import MonthPicker from "@/components/MonthPicker";
import {
  DASHBOARD_MAX_FUTURE_DAYS,
  DASHBOARD_MEAL_LABELS,
} from "@/constants/dashboard";
import { useAuth } from "@/context/AuthContext";
import { useDrawer } from "@/context/DrawerContext";
import { useMess } from "@/context/MessContext";
import { useColors } from "@/hooks/useColors";
import { exportDashboardBreakdownPdf } from "@/services/dashboardPdfService";
import {
  getDashboardRangeData,
  getDashboardSchedule,
  sendDashboardMonthlySummary,
  toggleDashboardMeal,
} from "@/services/dashboardService";
import type {
  DashboardDatePickerTarget,
  DashboardDateRange,
  DashboardMealType,
  MonthData,
  TodaySchedule,
} from "@/types/dashboard";
import {
  addDashboardDays,
  calculateDashboardAccounting,
  getCurrentDate,
  getDefaultDashboardRange,
} from "@/utils/dashboard";

interface DashboardScreenProps {
  onManageMealStatus: (date: string) => void;
}

export const DashboardScreen = ({
  onManageMealStatus,
}: DashboardScreenProps) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { mess, role, token } = useAuth();
  const { openDrawer } = useDrawer();
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
  const today = getCurrentDate();
  const maxFutureDate = addDashboardDays(today, DASHBOARD_MAX_FUTURE_DAYS);
  const defaultRange = getDefaultDashboardRange(currentYearMonth);
  const [selectedDate, setSelectedDate] = useState(today);
  const [keyCopied, setKeyCopied] = useState(false);
  const [schedule, setSchedule] = useState<TodaySchedule | null>(null);
  const [optOuts, setOptOuts] = useState<Set<string>>(new Set());
  const [pendingOptOuts, setPendingOptOuts] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState(defaultRange.startDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultRange.endDate);
  const [appliedRange, setAppliedRange] = useState<DashboardDateRange | null>(
    null,
  );
  const [rangeData, setRangeData] = useState<Record<string, MonthData>>({});
  const [rangeLoading, setRangeLoading] = useState(false);
  const [datePickerTarget, setDatePickerTarget] =
    useState<DashboardDatePickerTarget | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [summarySending, setSummarySending] = useState(false);

  const isAdmin = role === "admin";
  const isPast = selectedDate < today;
  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;
  const isAtFutureLimit = selectedDate >= maxFutureDate;
  const appliedStartDate = appliedRange?.startDate ?? defaultRange.startDate;
  const appliedEndDate = appliedRange?.endDate ?? defaultRange.endDate;
  const hasUnappliedDateChange =
    draftStartDate !== appliedStartDate || draftEndDate !== appliedEndDate;

  const fetchSchedule = useCallback(
    async (date: string) => {
      if (!token || !mess) return;
      try {
        const data = await getDashboardSchedule(mess.id, token, date);
        setSchedule(data);
        setOptOuts(new Set(data.myOptOuts));
      } catch {
        // Preserve the last successfully loaded schedule.
      }
    },
    [token, mess?.id],
  );

  useEffect(() => {
    setSchedule(null);
    void fetchSchedule(selectedDate);
  }, [fetchSchedule, selectedDate]);

  useEffect(() => {
    const nextRange = getDefaultDashboardRange(currentYearMonth);
    setDraftStartDate(nextRange.startDate);
    setDraftEndDate(nextRange.endDate);
    setAppliedRange(null);
    setRangeData({});
  }, [currentYearMonth, mess?.id]);

  const copyMessKey = useCallback(async () => {
    if (!mess?.messKey) return;
    await Clipboard.setStringAsync(mess.messKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1800);
  }, [mess?.messKey]);

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

  const performMealToggle = async (mealType: DashboardMealType) => {
    if (!token || !mess) return;
    const wasOptedOut = optOuts.has(mealType);
    setPendingOptOuts((current) => new Set([...current, mealType]));
    setOptOuts((current) => {
      const next = new Set(current);
      wasOptedOut ? next.delete(mealType) : next.add(mealType);
      return next;
    });
    try {
      await toggleDashboardMeal(mess.id, selectedDate, mealType, token);
      await fetchSchedule(selectedDate);
    } catch (error) {
      setOptOuts((current) => {
        const next = new Set(current);
        wasOptedOut ? next.add(mealType) : next.delete(mealType);
        return next;
      });
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Could not update meal preference",
      );
    } finally {
      setPendingOptOuts((current) => {
        const next = new Set(current);
        next.delete(mealType);
        return next;
      });
    }
  };

  const handleMealToggle = (mealType: DashboardMealType) => {
    if (!token || !mess || !schedule) return;
    if (isPast) {
      Alert.alert("Past Date", "You cannot change meal on/off for past dates.");
      return;
    }
    const action = optOuts.has(mealType) ? "turn on" : "turn off";
    Alert.alert(
      "Are you sure?",
      `Do you want to ${action} ${DASHBOARD_MEAL_LABELS[mealType]}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: () => void performMealToggle(mealType),
        },
      ],
    );
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMonth();
      const refreshedRange = appliedRange
        ? await fetchRange(appliedRange.startDate, appliedRange.endDate)
        : null;
      if (refreshedRange) setRangeData(refreshedRange);
      await fetchSchedule(selectedDate);
    } catch {
      // Keep the last successfully loaded figures visible.
    } finally {
      setRefreshing(false);
    }
  }, [refreshMonth, fetchSchedule, selectedDate, fetchRange, appliedRange]);

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

  const downloadBreakdownPdf = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    try {
      await exportDashboardBreakdownPdf({
        ...accounting,
        messName: mess?.name ?? "Mess",
        periodStart: appliedStartDate,
        periodEnd: appliedEndDate,
        consumerCount: consumers.length,
      });
    } catch (error) {
      Alert.alert(
        "PDF Error",
        error instanceof Error ? error.message : "Could not generate the PDF.",
      );
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleSendSummary = () => {
    if (!mess || !token) return;
    const send = async () => {
      setSummarySending(true);
      try {
        const { sent, total } = await sendDashboardMonthlySummary(
          mess.id,
          currentYearMonth,
          token,
        );
        Alert.alert(
          "Summary Sent",
          `Sent to ${sent} of ${total} members with email addresses.`,
        );
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to send summaries.",
        );
      } finally {
        setSummarySending(false);
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          `Send the ${currentYearMonth} monthly summary to all members?`,
        )
      ) {
        void send();
      }
      return;
    }
    Alert.alert(
      "Send Monthly Summary",
      `Email the ${currentYearMonth} breakdown to all members?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send Emails", onPress: () => void send() },
      ],
    );
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 118 : insets.bottom + 49;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPadding },
      ]}
    >
      <DashboardHeader
        colors={colors}
        messName={mess?.name}
        messKey={mess?.messKey}
        keyCopied={keyCopied}
        onMenu={openDrawer}
        onCopyKey={() => void copyMessKey()}
      />
      <MonthPicker />

      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor="#0e7871"
            colors={["#0e7871"]}
          />
        }
      >
        <DashboardMealSection
          colors={colors}
          selectedDate={selectedDate}
          today={today}
          isPast={isPast}
          isToday={isToday}
          isFuture={isFuture}
          isAtFutureLimit={isAtFutureLimit}
          isAdmin={isAdmin}
          schedule={schedule}
          optOuts={optOuts}
          pendingOptOuts={pendingOptOuts}
          onPrevious={() =>
            setSelectedDate((date) => addDashboardDays(date, -1))
          }
          onNext={() =>
            setSelectedDate((date) =>
              date >= maxFutureDate ? date : addDashboardDays(date, 1),
            )
          }
          onToday={() => setSelectedDate(today)}
          onManage={() => onManageMealStatus(selectedDate)}
          onToggleMeal={handleMealToggle}
        />
        <DashboardSummaryCards colors={colors} accounting={accounting} />
        <DashboardConsumerBreakdown
          colors={colors}
          accounting={accounting}
          consumerCount={consumers.length}
          appliedRange={appliedRange}
          draftStartDate={draftStartDate}
          draftEndDate={draftEndDate}
          hasUnappliedDateChange={hasUnappliedDateChange}
          rangeLoading={rangeLoading}
          pdfGenerating={pdfGenerating}
          onOpenDatePicker={setDatePickerTarget}
          onApplyRange={() => void applyDateRange()}
          onDownloadPdf={() => void downloadBreakdownPdf()}
        />
        {isAdmin && !appliedRange && (
          <DashboardSummaryButton
            sending={summarySending}
            onPress={handleSendSummary}
          />
        )}
      </ScrollView>

      <DashboardDatePicker
        colors={colors}
        visible={datePickerTarget !== null}
        value={datePickerTarget === "end" ? draftEndDate : draftStartDate}
        title={
          datePickerTarget === "end" ? "Select End Date" : "Select Start Date"
        }
        onClose={() => setDatePickerTarget(null)}
        onSelect={(date) => {
          if (datePickerTarget === "start") setDraftStartDate(date);
          if (datePickerTarget === "end") setDraftEndDate(date);
          setDatePickerTarget(null);
        }}
      />
    </View>
  );
};
