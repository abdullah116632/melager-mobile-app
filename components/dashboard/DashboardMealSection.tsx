import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import {
  DASHBOARD_MAX_FUTURE_DAYS,
  DASHBOARD_MEAL_ICONS,
  DASHBOARD_MEAL_LABELS,
  DASHBOARD_MEAL_TYPES,
} from "@/constants/dashboard";
import { useAuth } from "@/redux/hooks";
import {
  getDashboardSchedule,
  toggleDashboardMeal,
} from "@/services/dashboardService";
import type { DashboardMealType, TodaySchedule } from "@/types/dashboard";
import {
  addDashboardDays,
  formatDashboardDateLabel,
  formatDashboardFullDate,
  getCurrentDate,
  getDashboardMealEnabled,
} from "@/utils/dashboard";
import { DashboardMealCard } from "./DashboardMealCard";

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
  const maxFutureDate = addDashboardDays(today, DASHBOARD_MAX_FUTURE_DAYS);
  const [selectedDate, setSelectedDate] = useState(today);
  const [schedule, setSchedule] = useState<TodaySchedule | null>(null);
  const [optOuts, setOptOuts] = useState<Set<string>>(new Set());
  const [pendingOptOuts, setPendingOptOuts] = useState<Set<string>>(new Set());
  const isAdmin = role === "admin";
  const isPast = selectedDate < today;
  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;
  const isAtFutureLimit = selectedDate >= maxFutureDate;

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

  useImperativeHandle(
    ref,
    () => ({ refresh: () => fetchSchedule(selectedDate) }),
    [fetchSchedule, selectedDate],
  );

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

  const toggleMeal = (mealType: DashboardMealType) => {
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

  return (
    <View className="mx-4 mb-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-lg shadow-slate-300/30">
      <View className="flex-row items-center px-3 pb-2 pt-3">
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white shadow-md shadow-slate-300/40"
          onPress={() => setSelectedDate((date) => addDashboardDays(date, -1))}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 items-center px-2"
          onPress={isToday ? undefined : () => setSelectedDate(today)}
          activeOpacity={isToday ? 1 : 0.7}
        >
          <Text className="text-center font-inter-bold text-base text-slate-900">
            {formatDashboardDateLabel(selectedDate, today)}
          </Text>
          {!isToday && (
            <Text className="mt-0.5 text-center font-inter text-[10px] text-teal-700">
              {formatDashboardFullDate(selectedDate)} · Tap for Today
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          className={`h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white shadow-md shadow-slate-300/40 ${isAtFutureLimit ? "opacity-35" : "opacity-100"}`}
          onPress={() =>
            setSelectedDate((date) =>
              date >= maxFutureDate ? date : addDashboardDays(date, 1),
            )
          }
          activeOpacity={0.7}
          disabled={isAtFutureLimit}
        >
          <Feather name="chevron-right" size={20} color="#0F172A" />
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

      {isAdmin && (
        <View className="flex-row items-center border-t border-slate-100 px-3.5 pb-2.5 pt-2.5">
          {schedule ? (
            <View className="flex-row items-center gap-2">
              {DASHBOARD_MEAL_TYPES.map((mealType) => {
                const enabled = getDashboardMealEnabled(schedule, mealType);
                return (
                  <View
                    key={mealType}
                    className="flex-row items-center gap-[3px] rounded-full bg-teal-50 px-2 py-1"
                  >
                    <Text className="text-[13px]">
                      {DASHBOARD_MEAL_ICONS[mealType]}
                    </Text>
                    <Text
                      className={`font-inter-bold text-[13px] ${enabled ? "text-emerald-600" : "text-gray-400"}`}
                    >
                      {enabled ? schedule.activeByMeal[mealType] : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
          <View className="flex-1" />
          <TouchableOpacity
            className="flex-row items-center gap-1 rounded-full border border-teal-100 bg-white px-3 py-2 shadow-sm shadow-slate-300/30"
            onPress={() => router.push(`/meal-status?date=${selectedDate}`)}
            activeOpacity={0.75}
          >
            <Feather name="settings" size={13} color="#0F766E" />
            <Text className="font-inter-semibold text-xs text-teal-700">
              Manage
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-row gap-2.5 px-3.5 pb-4">
        {DASHBOARD_MEAL_TYPES.map((mealType) => (
          <DashboardMealCard
            key={mealType}
            mealType={mealType}
            schedule={schedule}
            optedOut={optOuts.has(mealType)}
            pending={pendingOptOuts.has(mealType)}
            canInteract={!isPast}
            onPress={toggleMeal}
          />
        ))}
      </View>
      {!isAdmin && !isPast && (
        <Text className="pb-2.5 text-center font-inter text-[11px] text-slate-500">
          Tap a meal to turn it on or off
        </Text>
      )}
    </View>
  );
});

DashboardMealSection.displayName = "DashboardMealSection";
