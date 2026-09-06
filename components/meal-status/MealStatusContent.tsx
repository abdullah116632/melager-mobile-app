import { useCallback, useEffect, useRef, useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppSelector, useAuth } from "@/redux/hooks";
import { selectMealMenuState } from "@/redux/slice/mealMenuSlice";
import { getMealStatus } from "@/services/mealStatusService";
import {
  cacheMealStatus,
  getLocalMealStatus,
  syncMealScheduleNow,
} from "@/services/mealStatusService";
import { useOfflineDatabase } from "@/offline/provider/OfflineDatabaseProvider";
import type { MealStatusConsumer } from "@/types/mealStatus";
import { getTodayDate } from "@/utils/mealStatus";
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
  const { database } = useOfflineDatabase();
  const { scheduleRevision } = useAppSelector(selectMealMenuState);
  const today = getTodayDate();
  const [selectedDate, setSelectedDate] = useState(() => initialDate ?? today);
  const [loading, setLoading] = useState(true);
  const [consumers, setConsumers] = useState<MealStatusConsumer[]>([]);
  const [schedule, setSchedule] = useState<MealStatusSchedule | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const load = useCallback(
    async (date: string, options: { silent?: boolean } = {}) => {
      if (!token || !mess?.id) return;
      const { silent = false } = options;
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
      } catch (error) {
        if (!silent) {
          Alert.alert(
            "Error",
            error instanceof Error ? error.message : "Failed to load",
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [database, mess?.id, token, user?.id],
  );

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
      <MealStatusHeader
        onBack={onBack}
        onRefresh={() => void load(selectedDate)}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-safe-offset-8 pt-4"
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
                  {selectedDate}
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
    </>
  );
};
