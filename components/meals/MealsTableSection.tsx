import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import { useOfflineDatabase } from "@/offline/provider/OfflineDatabaseProvider";
import {
  DailyMealsRepository,
  type DailyMealConflict,
} from "@/offline/features/dailyMeals/DailyMealsRepository";
import { subscribeToDailyMealConflicts } from "@/offline/features/dailyMeals/conflictEvents";
import { getOfflineRuntime } from "@/offline/runtime/getOfflineRuntime";
import MonthPicker from "@/components/MonthPicker";
import { useAppDispatch, useAuth, useMeals, useNetwork } from "@/redux/hooks";
import { dailyMealConflictResolved } from "@/redux/slice/mealsSlice";
import type { ActiveMealCell, MealCellDirection } from "@/types/meal";
import { MealCellEditor, type MealCellEditorHandle } from "./MealCellEditor";
import { MealsGrid, type MealsGridHandle } from "./MealsGrid";

export const MealsTableSection = () => {
  const dispatch = useAppDispatch();
  const { role, user, mess, token } = useAuth();
  const { isOnline } = useNetwork();
  const { database } = useOfflineDatabase();
  const {
    consumers,
    currentYearMonth,
    dataLoading,
    getMealCount,
    setMeal,
    getDaysInMonth,
  } = useMeals();
  const isAdmin = role === "admin";
  const [selectedCell, setSelectedCell] = useState<ActiveMealCell | null>(null);
  const [conflicts, setConflicts] = useState<DailyMealConflict[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(
    null,
  );
  const editorRef = useRef<MealCellEditorHandle | null>(null);
  const gridRef = useRef<MealsGridHandle | null>(null);
  const daysCount = getDaysInMonth(currentYearMonth);

  useEffect(() => {
    setSelectedCell(null);
  }, [currentYearMonth]);

  const refreshConflicts = useCallback(() => {
    if (!database || !user?.id || !mess?.id) return;
    void new DailyMealsRepository(database)
      .getConflicts(user.id, mess.id, currentYearMonth)
      .then(setConflicts)
      .catch(() => undefined);
  }, [database, currentYearMonth, mess?.id, user?.id]);

  useEffect(() => {
    refreshConflicts();
    return subscribeToDailyMealConflicts(refreshConflicts);
  }, [refreshConflicts]);

  const resolveConflict = useCallback(
    async (conflict: DailyMealConflict, resolution: "local" | "server") => {
      if (!database || !user?.id || !mess?.id) return;
      const conflictKey = `${conflict.consumerId}:${conflict.day}`;
      setResolvingConflict(conflictKey);
      try {
        const count = await new DailyMealsRepository(database).resolveConflict(
          user.id,
          mess.id,
          conflict,
          resolution,
        );
        dispatch(
          dailyMealConflictResolved({
            yearMonth: conflict.yearMonth,
            consumerId: conflict.consumerId,
            day: conflict.day,
            count,
          }),
        );
        if (resolution === "local" && token && isOnline) {
          void getOfflineRuntime(database)
            .engine.sync(
              { userId: user.id, messId: mess.id, token },
              { collections: ["daily_meals"], force: true },
            )
            .catch(() => undefined);
        }
        refreshConflicts();
      } catch (error) {
        Alert.alert(
          "Could not resolve conflict",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setResolvingConflict(null);
      }
    },
    [database, dispatch, isOnline, mess?.id, refreshConflicts, token, user?.id],
  );

  const selectCell = useCallback((consumerId: string, day: number) => {
    gridRef.current?.preserveVerticalPosition();
    setSelectedCell({ consumerId, day });
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  }, []);

  const copyAndMove = useCallback(
    (direction: MealCellDirection) => {
      if (!selectedCell || consumers.length === 0) return;
      const consumerIndex = consumers.findIndex(
        (consumer) => consumer.id === selectedCell.consumerId,
      );
      if (consumerIndex < 0) return;

      let nextConsumerIndex = consumerIndex;
      let nextDay = selectedCell.day;
      if (direction === "left") nextDay = Math.max(1, nextDay - 1);
      if (direction === "right") nextDay = Math.min(daysCount, nextDay + 1);
      if (direction === "up") {
        nextConsumerIndex = Math.max(0, consumerIndex - 1);
      }
      if (direction === "down") {
        nextConsumerIndex = Math.min(consumers.length - 1, consumerIndex + 1);
      }

      const nextConsumerId = consumers[nextConsumerIndex]?.id;
      if (
        !nextConsumerId ||
        (nextConsumerId === selectedCell.consumerId &&
          nextDay === selectedCell.day)
      ) {
        return;
      }

      const value =
        editorRef.current?.commitNow() ??
        getMealCount(
          currentYearMonth,
          selectedCell.consumerId,
          selectedCell.day,
        );
      setMeal(currentYearMonth, nextConsumerId, nextDay, value);
      setSelectedCell({ consumerId: nextConsumerId, day: nextDay });
      requestAnimationFrame(() => gridRef.current?.keepDayVisible(nextDay));
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    },
    [
      consumers,
      currentYearMonth,
      daysCount,
      getMealCount,
      selectedCell,
      setMeal,
    ],
  );

  return (
    <>
      <MonthPicker
        variant="dashboard"
        monthDataLoading={dataLoading}
        onCellLeft={isAdmin ? () => copyAndMove("left") : undefined}
        onCellRight={isAdmin ? () => copyAndMove("right") : undefined}
        onCellUp={isAdmin ? () => copyAndMove("up") : undefined}
        onCellDown={isAdmin ? () => copyAndMove("down") : undefined}
        cellNavEnabled={isAdmin && !!selectedCell}
      />

      {conflicts.length > 0 && (
        <View className="mx-3 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <Text className="font-inter-medium text-xs text-amber-800">
            {conflicts.length} meal update needs review because it was changed
            on another device.
          </Text>
          {conflicts.map((conflict) => {
            const conflictKey = `${conflict.consumerId}:${conflict.day}`;
            const consumerName =
              consumers.find((consumer) => consumer.id === conflict.consumerId)
                ?.name ?? `Consumer ${conflict.consumerId}`;
            const resolving = resolvingConflict === conflictKey;
            return (
              <View
                key={conflictKey}
                className="mt-2 rounded-lg border border-amber-200 bg-white px-3 py-2"
              >
                <Text className="font-inter-semibold text-xs text-slate-800">
                  {consumerName} · Day {conflict.day}
                </Text>
                <Text className="mt-1 font-inter text-xs text-slate-600">
                  This device: {conflict.localCount} · Server:{" "}
                  {conflict.serverCount}
                </Text>
                <View className="mt-2 flex-row gap-2">
                  <TouchableOpacity
                    disabled={resolving}
                    className="rounded-lg bg-teal-700 px-3 py-2"
                    onPress={() => void resolveConflict(conflict, "local")}
                  >
                    <Text className="font-inter-semibold text-xs text-white">
                      Keep this device
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={resolving}
                    className="rounded-lg bg-slate-200 px-3 py-2"
                    onPress={() => void resolveConflict(conflict, "server")}
                  >
                    <Text className="font-inter-semibold text-xs text-slate-800">
                      Use server value
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {isAdmin && selectedCell && (
        <MealCellEditor
          key={`${currentYearMonth}:${selectedCell.consumerId}:${selectedCell.day}`}
          ref={editorRef}
          cell={selectedCell}
          onDone={() => setSelectedCell(null)}
        />
      )}

      <MealsGrid
        ref={gridRef}
        selectedCell={selectedCell}
        onCellPress={selectCell}
      />
    </>
  );
};
