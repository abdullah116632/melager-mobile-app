import { memo } from "react";
import { Text, View } from "react-native";
import type { Consumer } from "@/types/mess";
import { formatMealValue } from "@/utils/meal";

interface MealGridRowProps {
  consumer: Consumer;
  index: number;
  days: number[];
  counts: number[];
  total: number;
  selectedDay: number | null;
  tableWidth: number;
  dayCellWidth: number;
  /** Width of the day columns that have not been staged in yet. */
  trailingWidth: number;
  yearMonth: string;
  /** Day-of-month that is today, or null when this month is not the current one. */
  todayDay: number | null;
}

/**
 * Cells are plain views, not touchables.
 *
 * Each cell used to build its own press handler and animated opacity node —
 * thousands of them for a grid where only one cell can ever be pressed at a
 * time. `MealsGrid` now works out which cell was pressed from the tap
 * coordinates, which is possible because every cell is the same size.
 *
 * The selected-cell styling below is untouched: it is driven by `selectedDay`,
 * which never had anything to do with how the press was detected.
 */
export const MealGridRow = memo(
  ({
    consumer,
    index,
    days,
    counts,
    total,
    selectedDay,
    tableWidth,
    dayCellWidth,
    trailingWidth,
    todayDay,
  }: MealGridRowProps) => (
    <View
      className={`h-[52px] flex-row border-b-[0.5px] border-slate-200 ${
        index % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"
      }`}
      style={{ width: tableWidth }}
    >
      <View className="h-[52px] w-[110px] border-r border-slate-200" />
      {days.map((day, dayIndex) => {
        const count = counts[dayIndex] ?? 0;
        const selected = selectedDay === day;
        return (
          <View
            key={day}
            className={`h-[52px] items-center justify-center ${
              count > 0 ? "bg-[#E5FAF3]" : ""
            } ${
              selected
                ? "z-10 border-2 border-teal-700 bg-teal-100"
                : `border-r-[0.5px] border-slate-200 ${
                    day === todayDay ? "border-b-2 border-b-teal-500" : ""
                  }`
            }`}
            style={
              selected
                ? {
                    width: dayCellWidth,
                    borderWidth: 2,
                    borderColor: "#0F766E",
                    zIndex: 10,
                  }
                : { width: dayCellWidth }
            }
            accessibilityLabel={`${consumer.name}, day ${day}, meal ${count}`}
          >
            <Text
              className={`text-[13px] ${
                count > 0
                  ? "font-inter-bold text-teal-700"
                  : "font-inter text-slate-500"
              }`}
            >
              {formatMealValue(count)}
            </Text>
          </View>
        );
      })}
      {trailingWidth > 0 ? (
        <View className="h-[52px]" style={{ width: trailingWidth }} />
      ) : null}
      <View className="h-[52px] w-[54px] items-center justify-center bg-slate-100">
        <Text className="font-inter-bold text-sm text-teal-700">
          {formatMealValue(total)}
        </Text>
      </View>
    </View>
  ),
  (previous, next) =>
    previous.consumer.id === next.consumer.id &&
    previous.consumer.name === next.consumer.name &&
    previous.index === next.index &&
    previous.days === next.days &&
    previous.total === next.total &&
    previous.selectedDay === next.selectedDay &&
    previous.tableWidth === next.tableWidth &&
    previous.dayCellWidth === next.dayCellWidth &&
    previous.trailingWidth === next.trailingWidth &&
    previous.yearMonth === next.yearMonth &&
    previous.todayDay === next.todayDay &&
    previous.counts.length === next.counts.length &&
    previous.counts.every((count, index) => count === next.counts[index]),
);

MealGridRow.displayName = "MealGridRow";
