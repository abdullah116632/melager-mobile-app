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
import { ApiError } from "@/lib/api";
import { DASHBOARD_MEAL_TYPES } from "@/constants/dashboard";
import {
  useAppDispatch,
  useAppSelector,
  useAuth,
  useNetwork,
} from "@/redux/hooks";
import {
  selectMealMenuState,
  setCalendarMarkers,
  setCalendarMarkersLoading,
  setCalendarYearMonth,
  setDatePickerVisible,
  setOptOuts,
  setPendingOptOut,
  setSchedule,
  setSelectedDate,
} from "@/redux/slice/mealMenuSlice";
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
import { MealOffOptionsSheet } from "@/components/dashboard/MealOffOptionsSheet";
import { useOfflineDatabase } from "@/offline/provider/OfflineDatabaseProvider";
import { MealScheduleRepository } from "@/offline/features/meals/MealScheduleRepository";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";

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
  const dispatch = useAppDispatch();
  const { mess, role, token, user } = useAuth();
  const { isOnline } = useNetwork();
  const { database } = useOfflineDatabase();
  const userId = user?.id ?? null;
  const today = getCurrentDate();
  const {
    selectedDate,
    datePickerVisible,
    calendarYearMonth,
    calendarMarkers,
    calendarMarkersLoading,
    schedule,
    optOuts: storedOptOuts,
    pendingOptOuts: storedPendingOptOuts,
    scheduleRevision,
  } = useAppSelector(selectMealMenuState);
  const optOuts = new Set(storedOptOuts);
  const pendingOptOuts = new Set(storedPendingOptOuts);
  const calendarRequestId = useRef(0);
  const mountedRef = useRef(true);
  const [offSheetMealType, setOffSheetMealType] =
    useState<DashboardMealType | null>(null);
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
      const repository =
        database && userId ? new MealScheduleRepository(database) : null;
      if (repository) {
        const local = await repository
          .getSnapshot(userId!, mess.id, date)
          .catch(() => null);
        if (local && mountedRef.current) dispatch(setSchedule(local.schedule));
      }
      try {
        const data = await getDashboardSchedule(mess.id, token, date);
        if (!mountedRef.current) return;
        if (repository) {
          await repository.replaceRemoteSchedule(userId!, mess.id, date, data);
          const latest = await repository.getSnapshot(userId!, mess.id, date);
          dispatch(setSchedule(latest?.schedule ?? data));
        } else {
          dispatch(setSchedule(data));
        }
      } catch {
        // Preserve the last successfully loaded schedule.
      }
    },
    [database, dispatch, mess?.id, token, userId],
  );

  const fetchCalendarMarkers = useCallback(
    async (yearMonth: string) => {
      if (!token || !mess) return;
      const requestId = ++calendarRequestId.current;
      dispatch(setCalendarMarkersLoading(true));
      const repository =
        database && userId ? new MealScheduleRepository(database) : null;
      if (repository) {
        const localMarkers = await repository
          .getCalendarMarkers(userId!, mess.id, yearMonth)
          .catch(() => ({}));
        if (mountedRef.current && calendarRequestId.current === requestId) {
          dispatch(setCalendarMarkers(localMarkers));
        }
      }
      if (!isOnline) {
        if (mountedRef.current && calendarRequestId.current === requestId) {
          dispatch(setCalendarMarkersLoading(false));
        }
        return;
      }
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
        if (repository) {
          await repository.replaceCalendarMarkers(
            userId!,
            mess.id,
            yearMonth,
            markers,
          );
        }
        dispatch(setCalendarMarkers(markers));
      } catch {
        if (mountedRef.current && calendarRequestId.current === requestId) {
          // The local calendar remains usable when the refresh fails.
        }
      } finally {
        if (mountedRef.current && calendarRequestId.current === requestId) {
          dispatch(setCalendarMarkersLoading(false));
        }
      }
    },
    [database, dispatch, isOnline, mess?.id, token, userId],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      calendarRequestId.current += 1;
    };
  }, []);

  useEffect(() => {
    dispatch(setSchedule(null));
    void fetchSchedule(selectedDate);
  }, [dispatch, fetchSchedule, isOnline, scheduleRevision, selectedDate]);

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
    const isOptedOut = !wasOptedOut;
    dispatch(setPendingOptOut({ mealType, pending: true }));
    dispatch(
      setOptOuts(
        wasOptedOut
          ? storedOptOuts.filter((item) => item !== mealType)
          : [...storedOptOuts, mealType],
      ),
    );
    try {
      let queued = !isOnline;
      if (!queued) {
        try {
          await toggleDashboardMeal(
            mess.id,
            selectedDate,
            mealType,
            scope,
            token,
            isOptedOut,
          );
        } catch (error) {
          queued =
            error instanceof TypeError ||
            (error instanceof ApiError && error.status === 408);
          if (!queued) throw error;
        }
      }

      if (queued) {
        if (!database || !user || !schedule) {
          throw new Error("Offline meal storage is unavailable.");
        }
        const repository = new MealScheduleRepository(database);
        await repository.saveOptOut(
          user.id,
          mess.id,
          selectedDate,
          mealType,
          scope,
          isOptedOut,
          schedule,
        );
        if (isOnline) {
          void getOfflineRuntime(database)
            .engine.sync(
              { userId: user.id, messId: mess.id, token },
              { collections: ["meal_schedule"], force: true },
            )
            .catch(() => undefined);
        }
      } else {
        await fetchSchedule(selectedDate);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      dispatch(
        setOptOuts(
          wasOptedOut
            ? [...storedOptOuts, mealType]
            : storedOptOuts.filter((item) => item !== mealType),
        ),
      );
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Could not update meal preference",
      );
    } finally {
      if (mountedRef.current) {
        dispatch(setPendingOptOut({ mealType, pending: false }));
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

    setOffSheetMealType(mealType);
  };

  return (
    <View className="mx-4 mb-4">
      <View
        className="overflow-hidden rounded-[18px] border border-slate-300 bg-white"
        style={menuCardShadow}
      >
        <View className="flex-row items-center border-b border-teal-100 bg-teal-50 px-4 py-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <Text className="font-inter-bold text-[17px] text-slate-900">
              {isToday
                ? "Today’s Menu"
                : `${formatDashboardDateLabel(selectedDate, today)} Menu`}
            </Text>
            {isAdmin ? (
              <TouchableOpacity
                className="h-8 w-8 items-center justify-center rounded-full bg-teal-200"
                onPress={() => router.push(`/meal-status?date=${selectedDate}`)}
                activeOpacity={0.75}
                accessibilityLabel="Manage meal schedule"
              >
                <Feather name="settings" size={14} color="#0F766E" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            className="flex-row items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-2.5 py-1.5"
            onPress={() => {
              dispatch(setCalendarYearMonth(selectedDate.slice(0, 7)));
              dispatch(setDatePickerVisible(true));
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
            <Feather name="chevron-down" size={12} color="#64748B" />
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

        <View className="overflow-hidden">
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
      </View>
      <DashboardDatePicker
        visible={datePickerVisible}
        value={selectedDate}
        title="Select meal date"
        dayMarkers={calendarMarkers}
        markersLoading={calendarMarkersLoading}
        onVisibleMonthChange={(yearMonth) =>
          dispatch(setCalendarYearMonth(yearMonth))
        }
        onClose={() => dispatch(setDatePickerVisible(false))}
        onSelect={(date) => {
          dispatch(setSelectedDate(date));
          dispatch(setDatePickerVisible(false));
        }}
      />
      <MealOffOptionsSheet
        visible={offSheetMealType !== null}
        mealType={offSheetMealType}
        dateLabel={formatDashboardDateLabel(selectedDate, today)}
        onClose={() => setOffSheetMealType(null)}
        onSelect={(scope) => {
          const mealType = offSheetMealType;
          setOffSheetMealType(null);
          if (mealType) void performMealToggle(mealType, scope);
        }}
      />
    </View>
  );
});

DashboardMealSection.displayName = "DashboardMealSection";
