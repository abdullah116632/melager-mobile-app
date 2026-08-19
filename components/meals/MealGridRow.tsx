import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { Consumer } from "@/context/MessContext";
import { formatMealValue, isMealDayToday } from "@/utils/meal";

interface MealGridRowProps {
  consumer: Consumer;
  index: number;
  days: number[];
  counts: number[];
  total: number;
  selectedDay: number | null;
  isAdmin: boolean;
  tableWidth: number;
  yearMonth: string;
  onCellPress: (consumerId: string, day: number) => void;
}

export const MealGridRow = memo(
  ({
    consumer,
    index,
    days,
    counts,
    total,
    selectedDay,
    isAdmin,
    tableWidth,
    yearMonth,
    onCellPress,
  }: MealGridRowProps) => (
    <View
      className={`h-[48px] flex-row border-b-[0.5px] border-slate-200 ${
        index % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"
      }`}
      style={{ width: tableWidth }}
    >
      <View className="h-[48px] w-[110px] border-r border-slate-200" />
      {days.map((day, dayIndex) => {
        const count = counts[dayIndex] ?? 0;
        const selected = selectedDay === day;
        return (
          <TouchableOpacity
            key={day}
            disabled={!isAdmin}
            className={`h-[48px] w-[48px] items-center justify-center ${
              count > 0 ? "bg-[#E5FAF3]" : ""
            } ${
              selected
                ? "z-10 border-2 border-teal-700 bg-teal-100"
                : `border-r-[0.5px] border-slate-200 ${
                    isMealDayToday(yearMonth, day)
                      ? "border-b-2 border-b-teal-500"
                      : ""
                  }`
            }`}
            style={
              selected
                ? {
                    borderWidth: 2,
                    borderColor: "#0F766E",
                    zIndex: 10,
                  }
                : undefined
            }
            onPress={() => onCellPress(consumer.id, day)}
            activeOpacity={isAdmin ? 0.65 : 1}
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
          </TouchableOpacity>
        );
      })}
      <View className="h-[48px] w-[54px] items-center justify-center bg-slate-100">
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
    previous.isAdmin === next.isAdmin &&
    previous.tableWidth === next.tableWidth &&
    previous.yearMonth === next.yearMonth &&
    previous.onCellPress === next.onCellPress &&
    previous.counts.length === next.counts.length &&
    previous.counts.every((count, index) => count === next.counts[index]),
);

MealGridRow.displayName = "MealGridRow";
