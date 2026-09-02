import Feather from "@expo/vector-icons/Feather";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DashboardConsumerBreakdown } from "@/components/dashboard/DashboardConsumerBreakdown";
import {
  useAppDispatch,
  useAuth,
  useDeposits,
  useExpenses,
  useMeals,
  useMess,
} from "@/redux/hooks";
import { refreshConsumers } from "@/redux/slice/messSlice";
import { getDashboardRangeData } from "@/services/dashboardService";
import type { DashboardDateRange, MonthData } from "@/types/dashboard";
import {
  calculateDashboardAccounting,
  getDefaultDashboardRange,
} from "@/utils/dashboard";

export const ConsumerBreakdownScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { mess, token } = useAuth();
  const { consumers, currentYearMonth } = useMess();
  const { getGrandTotal, getConsumerTotal } = useMeals();
  const { getMonthExpenseTotal } = useExpenses();
  const { getGrandDepositTotal, getConsumerDepositTotal } = useDeposits();
  const defaultRange = getDefaultDashboardRange(currentYearMonth);
  const [draftStartDate, setDraftStartDate] = useState(defaultRange.startDate);
  const [draftEndDate, setDraftEndDate] = useState(defaultRange.endDate);
  const [appliedRange, setAppliedRange] = useState<DashboardDateRange | null>(
    null,
  );
  const [rangeData, setRangeData] = useState<Record<string, MonthData>>({});
  const [rangeLoading, setRangeLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!mess) return;
      void dispatch(refreshConsumers())
        .unwrap()
        .catch(() => undefined);
    }, [dispatch, mess?.id]),
  );

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
      setAppliedRange({ startDate: draftStartDate, endDate: draftEndDate });
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
    <View
      className={`flex-1 bg-[#F4F8FC] ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
    >
      <StatusBar style="light" backgroundColor="#075F5B" />
      {Platform.OS !== "web" ? (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-0 z-50 bg-[#075F5B]"
          style={{ height: insets.top }}
        />
      ) : null}
      <View className="flex-row items-center bg-[#075F5B] px-4 pb-4 pt-2">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15"
          onPress={() => router.back()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
        >
          <Feather name="arrow-left" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter text-[10px] font-bold uppercase tracking-[1.3px] text-teal-100">
            Dashboard report
          </Text>
          <Text className="mt-0.5 font-inter-bold text-[18px] text-white">
            Consumer Breakdown
          </Text>
        </View>
      </View>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName={
          Platform.OS === "web" ? "py-4 pb-8" : "py-4 pb-safe-offset-[32px]"
        }
      >
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
      </ScrollView>
    </View>
  );
};
