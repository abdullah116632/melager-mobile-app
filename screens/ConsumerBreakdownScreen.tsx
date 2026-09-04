import Feather from "@expo/vector-icons/Feather";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { clearApiCache } from "@/lib/api";
import {
  loadConsumerBreakdownFromCache,
  saveConsumerBreakdownToCache,
} from "@/lib/cache";
import {
  useAppDispatch,
  useAuth,
  useDeposits,
  useExpenses,
  useMeals,
  useMess,
  useNetwork,
} from "@/redux/hooks";
import { loadMonth, refreshConsumers } from "@/redux/slice/messSlice";
import { markConsumerBreakdownNotificationsRead } from "@/redux/slice/consumerBreakdownNotificationsSlice";
import {
  apiActionFailed,
  offlineActionFailed,
} from "@/redux/slice/networkSlice";
import { getDashboardRangeData } from "@/services/dashboardService";
import type { DashboardDateRange, MonthData } from "@/types/dashboard";
import type { Consumer } from "@/types/mess";
import {
  calculateDashboardAccounting,
  getDefaultDashboardRange,
} from "@/utils/dashboard";

const getMonthConsumers = (data: MonthData): Consumer[] =>
  data.consumers.map((consumer) => ({
    id: consumer.id.toString(),
    name: consumer.name,
    userId: consumer.userId,
    email: consumer.email,
    mobileNumber: consumer.mobileNumber,
    isAdmin: consumer.isAdmin,
    accountDeletedAt: consumer.accountDeletedAt,
  }));

export const ConsumerBreakdownScreen = ({
  returnTo = "dashboard",
}: {
  returnTo?: "dashboard" | "manager";
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { mess, token } = useAuth();
  const { consumers, currentYearMonth } = useMess();
  const { isOnline } = useNetwork();
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
  const [breakdownConsumers, setBreakdownConsumers] =
    useState<Consumer[]>(consumers);
  const consumersRef = useRef(consumers);
  const [rangeLoading, setRangeLoading] = useState(false);

  useEffect(() => {
    consumersRef.current = consumers;
    setBreakdownConsumers(consumers);
  }, [consumers]);

  useFocusEffect(
    useCallback(() => {
      if (!mess || !token) return;
      void dispatch(markConsumerBreakdownNotificationsRead());
      let cancelled = false;

      const hydrateThenRefresh = async () => {
        const nextDefaultRange = getDefaultDashboardRange(currentYearMonth);
        const cached = await loadConsumerBreakdownFromCache(mess.id);
        if (cancelled) return;

        const cachedRange = cached?.appliedRange ?? null;
        const cachedRangeData = cached?.rangeData ?? {};
        setAppliedRange(cachedRange);
        setRangeData(cachedRangeData);
        setDraftStartDate(cachedRange?.startDate ?? nextDefaultRange.startDate);
        setDraftEndDate(cachedRange?.endDate ?? nextDefaultRange.endDate);
        if (cached) setBreakdownConsumers(cached.consumers);

        // Render the persisted snapshot first. This automatic network refresh
        // is best-effort, so failure leaves the cached values untouched.
        if (!isOnline) return;

        clearApiCache();
        let latestConsumers = cached?.consumers ?? consumersRef.current;
        let latestRangeData = cachedRangeData;

        try {
          const refreshed = await dispatch(refreshConsumers()).unwrap();
          if (cancelled) return;
          if (refreshed) {
            latestConsumers = refreshed.consumers;
            setBreakdownConsumers(refreshed.consumers);
          }
        } catch {}

        try {
          const monthResult = await dispatch(
            loadMonth({
              messId: mess.id,
              yearMonth: currentYearMonth,
              force: true,
            }),
          ).unwrap();
          if (cancelled) return;
          if (monthResult.data) {
            latestConsumers = getMonthConsumers(monthResult.data);
            setBreakdownConsumers(latestConsumers);
            if (!cachedRange) {
              latestRangeData = {
                [currentYearMonth]: monthResult.data,
              };
              setRangeData(latestRangeData);
            }
          }
        } catch {}

        if (cachedRange) {
          try {
            latestRangeData = await getDashboardRangeData(
              mess.id,
              token,
              cachedRange.startDate,
              cachedRange.endDate,
            );
            if (cancelled) return;
            setRangeData(latestRangeData);
          } catch {}
        }

        if (cancelled) return;
        void saveConsumerBreakdownToCache(mess.id, {
          appliedRange: cachedRange,
          rangeData: latestRangeData,
          consumers: latestConsumers,
        });
      };

      void hydrateThenRefresh();
      return () => {
        cancelled = true;
      };
    }, [currentYearMonth, dispatch, isOnline, mess?.id, token]),
  );

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
    if (!isOnline) {
      dispatch(offlineActionFailed("refresh"));
      return;
    }
    setRangeLoading(true);
    try {
      clearApiCache();
      const data = await fetchRange(draftStartDate, draftEndDate);
      if (!data) return;
      const nextRange = {
        startDate: draftStartDate,
        endDate: draftEndDate,
      };
      const firstMonth = Object.values(data)[0];
      const latestConsumers = firstMonth
        ? getMonthConsumers(firstMonth)
        : breakdownConsumers;
      setRangeData(data);
      setAppliedRange(nextRange);
      setBreakdownConsumers(latestConsumers);
      if (mess) {
        void saveConsumerBreakdownToCache(mess.id, {
          appliedRange: nextRange,
          rangeData: data,
          consumers: latestConsumers,
        });
      }
    } catch (error) {
      dispatch(
        apiActionFailed(
          error instanceof Error
            ? error.message
            : "Could not load the selected date range.",
        ),
      );
    } finally {
      setRangeLoading(false);
    }
  };

  const accounting = calculateDashboardAccounting({
    consumers: breakdownConsumers,
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
          onPress={() =>
            router.replace(
              returnTo === "manager" ? "/(tabs)/manager" : "/(tabs)/dashboard",
            )
          }
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
