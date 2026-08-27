import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import MonthPicker from "@/components/MonthPicker";
import { useAuth } from "@/redux/hooks";
import { useMeals } from "@/redux/hooks";
import type { ActiveMealCell, MealCellDirection } from "@/types/meal";
import { MealCellEditor, type MealCellEditorHandle } from "./MealCellEditor";
import { MealsGrid, type MealsGridHandle } from "./MealsGrid";

export const MealsTableSection = () => {
  const { role } = useAuth();
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
  const editorRef = useRef<MealCellEditorHandle | null>(null);
  const gridRef = useRef<MealsGridHandle | null>(null);
  const daysCount = getDaysInMonth(currentYearMonth);

  useEffect(() => {
    setSelectedCell(null);
  }, [currentYearMonth]);

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
