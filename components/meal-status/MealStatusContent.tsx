import { useCallback, useEffect, useRef, useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppSelector, useAuth, useNetwork } from "@/redux/hooks";
import { clearApiCache } from "@/lib/api";
import { selectMealMenuState } from "@/redux/slice/mealMenuSlice";
import { getMealStatus } from "@/services/mealStatusService";
import {
  cacheMealStatus,
  getLocalMealStatus,
  syncMealScheduleNow,
} from "@/services/mealStatusService";
import { useOfflineDatabase } from "@/offline/provider/OfflineDatabaseProvider";
import type { MealStatusConsumer } from "@/types/mealStatus";
import { formatDateDMY, getTodayDate } from "@/utils/mealStatus";
import { MealOptOutTable } from "./MealOptOutTable";
import { MealStatusHeader } from "./MealStatusHeader";
import { ScheduleEditor } from "./ScheduleEditor";
import { DashboardDatePicker } from "../dashboard/DashboardDatePicker";

interface MealStatusContentProps {
  initialDate?: string;
  onBack: () => void;
}

type MealStatusSchedule = Awaited<ReturnType<typeof getMealStatus>>["schedule"];

export const MealStatusContent = ({
  initialDate,
  onBack,
}: MealStatusContentProps) => {
  const { mess, token, user } = useAuth();
  const { isOnline } = useNetwork();
  const { database } = useOfflineDatabase();
  const { scheduleRevision } = useAppSelector(selectMealMenuState);
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(() => initialDate ?? today);
  const [loading, setLoading] = useState(true);
  const [consumers, setConsumers] = useState<MealStatusConsumer[]>([]);
  const [schedule, setSchedule] = useState<MealStatusSchedule | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ type, message });
      toastTimerRef.current = setTimeout(() => setToast(null), 2200);
    },
    [],
  );

  const load = useCallback(
    async (
      date: string,
      options: { silent?: boolean; suppressAlert?: boolean } = {},
    ) => {
      if (!token || !mess?.id) return false;
      const { silent = false, suppressAlert = false } = options;
      if (!silent) {
        setLoadedDate(null);
        setLoading(true);

        const local = await getLocalMealStatus(
          database,
          user?.id ?? null,
          mess.id,
          date,
        );
        if (local) {
          setConsumers(local.consumers);
          setSchedule(local.schedule.schedule);
          setLoadedDate(date);
          setLoading(false);
        }
      }

      try {
        const data = await getMealStatus(mess.id, date, token);
        setConsumers(data.consumers);
        setSchedule(data.schedule);
        setLoadedDate(date);
        await cacheMealStatus(
          database,
          user?.id ?? null,
          mess.id,
          date,
          data.schedule,
          data.consumers,
          data.myOptOuts,
        );
        if (user?.id) {
          void syncMealScheduleNow(database, token, user.id, mess.id).catch(
            () => undefined,
          );
        }
        return true;
      } catch (error) {
        if (!silent && !suppressAlert) {
          Alert.alert(
            "Error",
            error instanceof Error ? error.message : "Failed to load",
          );
        }
        return false;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [database, mess?.id, token, user?.id],
  );

  const handlePullRefresh = useCallback(async () => {
    if (!isOnline) {
      showToast("error", "Refresh failed. Check your connection.");
      return;
    }
    setRefreshing(true);
    // A manual refresh must hit the network, not the 15s GET cache.
    clearApiCache();
    const success = await load(selectedDate, {
      silent: true,
      suppressAlert: true,
    });
    setRefreshing(false);
    showToast(
      success ? "success" : "error",
      success ? "Refresh successful" : "Refresh failed. Check your connection.",
    );
  }, [isOnline, load, selectedDate, showToast]);

  useEffect(() => {
    void load(selectedDate);
  }, [load, selectedDate]);

  // scheduleRevision bumps on the "meal-schedule:updated" socket event (e.g.
  // another admin editing the same mess). Refresh quietly in the background
  // instead of flashing the full-page spinner or blocking Save mid-edit.
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);
  const skipNextRevisionRef = useRef(true);
  useEffect(() => {
    if (skipNextRevisionRef.current) {
      skipNextRevisionRef.current = false;
      return;
    }
    void load(selectedDateRef.current, { silent: true });
  }, [load, scheduleRevision]);

  return (
    <>
      <MealStatusHeader onBack={onBack} />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-safe-offset-8 pt-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handlePullRefresh()}
              tintColor="#0F766E"
              colors={["#0F766E"]}
            />
          }
        >
          <View className="mx-4 mb-3.5 overflow-hidden rounded-[18px] border border-slate-300 bg-white">
            <View className="flex-row items-center border-b border-teal-100 bg-teal-50 px-4 py-3">
              <Text className="flex-1 font-inter-bold text-[17px] text-slate-900">
                Meal Schedule
              </Text>
              <TouchableOpacity
                className="flex-row items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-2.5 py-1.5"
                onPress={() => setDatePickerVisible(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open meal date calendar"
              >
                <Feather name="calendar" size={14} color="#64748B" />
                <Text className="font-inter-medium text-[11px] text-slate-500">
                  {formatDateDMY(selectedDate)}
                </Text>
                <Feather name="chevron-down" size={12} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
          <DashboardDatePicker
            visible={datePickerVisible}
            value={selectedDate}
            title="Select meal date"
            onClose={() => setDatePickerVisible(false)}
            onSelect={(date) => {
              setSelectedDate(date);
              setDatePickerVisible(false);
            }}
          />
          <ScheduleEditor
            schedule={schedule}
            selectedDate={selectedDate}
            loadedDate={loadedDate}
          />
          <MealOptOutTable consumers={consumers} />
        </ScrollView>
      )}

      {toast && (
        <View
          pointerEvents="none"
          className="absolute bottom-8 left-0 right-0 z-50 items-center"
        >
          <View
            className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 shadow-md ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 shadow-emerald-900/15"
                : "border-red-200 bg-red-50 shadow-red-900/15"
            }`}
          >
            <Feather
              name={toast.type === "success" ? "check-circle" : "alert-circle"}
              size={15}
              color={toast.type === "success" ? "#059669" : "#DC2626"}
            />
            <Text
              className={`font-inter-semibold text-xs ${
                toast.type === "success" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {toast.message}
            </Text>
          </View>
        </View>
      )}
    </>
  );
};
