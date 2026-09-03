import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import {
  DASHBOARD_MEAL_LABELS,
  DASHBOARD_MEAL_TYPES,
} from "@/constants/dashboard";
import { useAuth } from "@/redux/hooks";
import {
  getDashboardMealCalendar,
  getDashboardSchedule,
  toggleDashboardMeal,
} from "@/services/dashboardService";
import type { DashboardMealType, TodaySchedule } from "@/types/dashboard";
import {
  formatDashboardDateLabel,
  getCurrentDate,
  getDashboardMealEnabled,
} from "@/utils/dashboard";
import { DashboardMealCard } from "@/components/dashboard/DashboardMealCard";
import { DashboardDatePicker } from "@/components/dashboard/DashboardDatePicker";

const menuCardShadow = {
  shadowColor: "#94A3B8",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.16,
  shadowRadius: 10,
  elevation: 4,
};

export interface DashboardMealSectionHandle {
  refresh: () => Promise<void>;
}

export const DashboardMealSection = forwardRef<
  DashboardMealSectionHandle,
  object
>((_props, ref) => {
  const router = useRouter();
  const { mess, role, token } = useAuth();
  const today = getCurrentDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [calendarYearMonth, setCalendarYearMonth] = useState(today.slice(0, 7));
  const [calendarMarkers, setCalendarMarkers] = useState<
    Record<string, string[]>
  >({});
  const [calendarMarkersLoading, setCalendarMarkersLoading] = useState(false);
  const calendarRequestId = useRef(0);
  const mountedRef = useRef(true);
  const [schedule, setSchedule] = useState<TodaySchedule | null>(null);
  const [optOuts, setOptOuts] = useState<Set<string>>(new Set());
  const [pendingOptOuts, setPendingOptOuts] = useState<Set<string>>(new Set());
  const isAdmin = role === "admin";
  const isPast = selectedDate < today;
  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;
  const compactDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
    "en-GB",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );

  const fetchSchedule = useCallback(
    async (date: string) => {
      if (!token || !mess) return;
      try {
        const data = await getDashboardSchedule(mess.id, token, date);
        if (!mountedRef.current) return;
        setSchedule(data);
        setOptOuts(new Set(data.myOptOuts));
      } catch {
        // Preserve the last successfully loaded schedule.
      }
    },
    [token, mess?.id],
  );

  const fetchCalendarMarkers = useCallback(
    async (yearMonth: string) => {
      if (!token || !mess) return;
      const requestId = ++calendarRequestId.current;
      setCalendarMarkersLoading(true);
      try {
        const data = await getDashboardMealCalendar(mess.id, token, yearMonth);
        if (!mountedRef.current || calendarRequestId.current !== requestId)
          return;
        const markers: Record<string, string[]> = {};
        for (const day of data.days) {
          markers[day.date] = day.meals.map((mealType) =>
            mealType === "breakfast" ? "B" : mealType === "lunch" ? "L" : "D",
          );
        }
        setCalendarMarkers(markers);
      } catch {
        if (mountedRef.current && calendarRequestId.current === requestId) {
          setCalendarMarkers({});
        }
      } finally {
        if (mountedRef.current && calendarRequestId.current === requestId) {
          setCalendarMarkersLoading(false);
        }
      }
    },
    [mess?.id, token],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      calendarRequestId.current += 1;
    };
  }, []);

  useEffect(() => {
    setSchedule(null);
    void fetchSchedule(selectedDate);
  }, [fetchSchedule, selectedDate]);

  useEffect(() => {
    if (datePickerVisible) void fetchCalendarMarkers(calendarYearMonth);
  }, [calendarYearMonth, datePickerVisible, fetchCalendarMarkers]);

  useImperativeHandle(
    ref,
    () => ({ refresh: () => fetchSchedule(selectedDate) }),
    [fetchSchedule, selectedDate],
  );

  const performMealToggle = async (
    mealType: DashboardMealType,
    scope: "day" | "ongoing" = "day",
  ) => {
    if (!token || !mess) return;
    const wasOptedOut = optOuts.has(mealType);
    setPendingOptOuts((current) => new Set([...current, mealType]));
    setOptOuts((current) => {
      const next = new Set(current);
      wasOptedOut ? next.delete(mealType) : next.add(mealType);
      return next;
    });
    try {
      await toggleDashboardMeal(mess.id, selectedDate, mealType, scope, token);
      await fetchSchedule(selectedDate);
    } catch (error) {
      if (!mountedRef.current) return;
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
      if (mountedRef.current) {
        setPendingOptOuts((current) => {
          const next = new Set(current);
          next.delete(mealType);
          return next;
        });
      }
    }
  };

  const toggleMeal = (mealType: DashboardMealType) => {
    if (!token || !mess) return;
    if (isPast) return;
    if (!schedule) {
      Alert.alert(
        "Schedule unavailable",
        "Meal status could not be loaded. Please refresh and try again.",
      );
      return;
    }
    if (!getDashboardMealEnabled(schedule, mealType)) return;
    if (optOuts.has(mealType)) {
      void performMealToggle(mealType);
      return;
    }

    Alert.alert(
      `Turn off ${DASHBOARD_MEAL_LABELS[mealType]}`,
      "How long do you want to keep this meal off?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Only for today",
          onPress: () => void performMealToggle(mealType, "day"),
        },
        {
          text: "Until I turn on",
          onPress: () => void performMealToggle(mealType, "ongoing"),
        },
      ],
    );
  };

  return (
    <View className="mx-4 mb-4">
      <View className="mb-3 flex-row items-center">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text className="font-inter-bold text-[17px] text-slate-900">
            {isToday
              ? "Today’s Menu"
              : `${formatDashboardDateLabel(selectedDate, today)} Menu`}
          </Text>
          {isAdmin ? (
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-teal-50"
              onPress={() => router.push(`/meal-status?date=${selectedDate}`)}
              activeOpacity={0.75}
              accessibilityLabel="Manage meal schedule"
            >
              <Feather name="settings" size={14} color="#0F766E" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
          onPress={() => {
            setCalendarYearMonth(selectedDate.slice(0, 7));
            setDatePickerVisible(true);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open meal date calendar"
        >
          <Feather name="calendar" size={14} color="#64748B" />
          <Text
            className="font-inter-medium text-[11px] text-slate-500"
            numberOfLines={1}
          >
            {compactDate}
          </Text>
        </TouchableOpacity>
      </View>

      {isPast && (
        <View className="flex-row items-center gap-1.5 border-b-[0.5px] border-amber-200 bg-amber-100 px-3.5 py-[7px]">
          <Feather name="lock" size={12} color="#92400E" />
          <Text className="font-inter-medium text-xs text-amber-800">
            Past date — view only, meal on/off locked
          </Text>
        </View>
      )}
      {isFuture && (
        <View className="flex-row items-center gap-1.5 border-b-[0.5px] border-blue-200 bg-blue-50 px-3.5 py-[7px]">
          <Feather name="calendar" size={12} color="#1E40AF" />
          <Text className="font-inter-medium text-xs text-blue-800">
            Future date — meal on/off allowed
          </Text>
        </View>
      )}

      <View
        className="overflow-hidden rounded-[20px] border border-slate-100 bg-white"
        style={menuCardShadow}
      >
        {DASHBOARD_MEAL_TYPES.map((mealType, index) => {
          const enabled = getDashboardMealEnabled(schedule, mealType);
          return (
            <DashboardMealCard
              key={mealType}
              mealType={mealType}
              schedule={schedule}
              activeCount={
                enabled ? (schedule?.activeByMeal[mealType] ?? 0) : 0
              }
              optedOut={optOuts.has(mealType)}
              pending={pendingOptOuts.has(mealType)}
              canInteract={!isPast && enabled}
              isLast={index === DASHBOARD_MEAL_TYPES.length - 1}
              onPress={toggleMeal}
            />
          );
        })}
      </View>
      {!isAdmin && !isPast && (
        <Text className="pb-2.5 text-center font-inter text-[11px] text-slate-500">
          Tap a meal to turn it on or off
        </Text>
      )}

      <DashboardDatePicker
        visible={datePickerVisible}
        value={selectedDate}
        title="Select meal date"
        dayMarkers={calendarMarkers}
        markersLoading={calendarMarkersLoading}
        onVisibleMonthChange={setCalendarYearMonth}
        onClose={() => setDatePickerVisible(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setDatePickerVisible(false);
        }}
      />
    </View>
  );
});

DashboardMealSection.displayName = "DashboardMealSection";
