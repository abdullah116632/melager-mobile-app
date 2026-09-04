import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { MEAL_STATUS_MAX_FUTURE_DAYS } from "@/constants/mealStatus";
import { useAuth } from "@/redux/hooks";
import { getMealStatus } from "@/services/mealStatusService";
import { cacheMealStatus, getLocalMealStatus, syncMealScheduleNow } from "@/services/mealStatusService";
import { useOfflineDatabase } from "@/offline/provider/OfflineDatabaseProvider";
import type { MealStatusConsumer } from "@/types/mealStatus";
import { addDays, getTodayDate } from "@/utils/mealStatus";
import { MealOptOutTable } from "./MealOptOutTable";
import { MealStatusHeader } from "./MealStatusHeader";
import { ScheduleEditor } from "./ScheduleEditor";

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
  const today = getTodayDate();
  const maxFutureDate = addDays(today, MEAL_STATUS_MAX_FUTURE_DAYS);
  const [selectedDate, setSelectedDate] = useState(() =>
    initialDate && initialDate > maxFutureDate
      ? maxFutureDate
      : (initialDate ?? today),
  );
  const [loading, setLoading] = useState(true);
  const [consumers, setConsumers] = useState<MealStatusConsumer[]>([]);
  const [schedule, setSchedule] = useState<MealStatusSchedule | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);

  const load = useCallback(
    async (date: string) => {
      if (!token || !mess?.id) return;
      setLoadedDate(null);
      setLoading(true);

      const local = await getLocalMealStatus(database, user?.id ?? null, mess.id, date);
      if (local) {
        setConsumers(local.consumers);
        setSchedule(local.schedule.schedule);
        setLoadedDate(date);
        setLoading(false);
      }

      try {
        const data = await getMealStatus(mess.id, date, token);
        setConsumers(data.consumers);
        setSchedule(data.schedule);
        setLoadedDate(date);
        await cacheMealStatus(database, user?.id ?? null, mess.id, date, data.schedule, data.consumers, data.myOptOuts);
        if (user?.id) {
          void syncMealScheduleNow(database, token, user.id, mess.id).catch(() => undefined);
        }
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to load",
        );
      } finally {
        setLoading(false);
      }
    },
    [database, mess?.id, token, user?.id],
  );

  useEffect(() => {
    void load(selectedDate);
  }, [load, selectedDate]);

  return (
    <>
      <MealStatusHeader
        selectedDate={selectedDate}
        today={today}
        isAtFutureLimit={selectedDate >= maxFutureDate}
        onBack={onBack}
        onPreviousDate={() => setSelectedDate((date) => addDays(date, -1))}
        onNextDate={() =>
          setSelectedDate((date) =>
            date >= maxFutureDate ? date : addDays(date, 1),
          )
        }
        onToday={() => setSelectedDate(today)}
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
