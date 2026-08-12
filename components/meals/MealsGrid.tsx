import { memo, useEffect, useState, type RefObject } from "react";
import {
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import {
  DAY_CELL_H,
  DAY_CELL_W,
  MEAL_TOTAL_DARK,
  NAME_COL_W,
  TOTAL_COL_W,
} from "@/constants/meal";
import type { Consumer } from "@/context/MessContext";
import type { ActiveMealCell } from "@/types/meal";
import { isMealDayToday } from "@/utils/meal";
import { MealsEmptyState } from "./MealsEmptyState";

const CONSUMER_ACCENTS = [
  "#059669",
  "#0284C7",
  "#7C3AED",
  "#EA580C",
  "#DB2777",
  "#CA8A04",
] as const;

const getConsumerNameColor = (consumerId: string) => {
  const hash = Array.from(consumerId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return CONSUMER_ACCENTS[hash % CONSUMER_ACCENTS.length];
};

const formatMealValue = (value: number) =>
  value > 0 ? value.toLocaleString("en-IN", { maximumFractionDigits: 3 }) : "-";

interface MealRowProps {
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

const MealRow = memo(
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
  }: MealRowProps) => (
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

MealRow.displayName = "MealRow";

interface MealsGridProps {
  consumers: Consumer[];
  yearMonth: string;
  days: number[];
  isAdmin: boolean;
  selectedCell: ActiveMealCell | null;
  refreshing: boolean;
  viewportWidth: number;
  onViewportWidthChange: (width: number) => void;
  headerScrollRef: RefObject<ScrollView | null>;
  bodyScrollRef: RefObject<ScrollView | null>;
  getMealCount: (yearMonth: string, consumerId: string, day: number) => number;
  getConsumerTotal: (yearMonth: string, consumerId: string) => number;
  getDayTotal: (yearMonth: string, day: number) => number;
  getGrandTotal: (yearMonth: string) => number;
  onHeaderScroll: () => void;
  onBodyScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onRefresh: () => void;
  onCellPress: (consumerId: string, day: number) => void;
  onRemoveConsumer: (consumerId: string, consumerName: string) => void;
}

export const MealsGrid = ({
  consumers,
  yearMonth,
  days,
  isAdmin,
  selectedCell,
  refreshing,
  viewportWidth,
  onViewportWidthChange,
  headerScrollRef,
  bodyScrollRef,
  getMealCount,
  getConsumerTotal,
  getDayTotal,
  getGrandTotal,
  onHeaderScroll,
  onBodyScroll,
  onRefresh,
  onCellPress,
  onRemoveConsumer,
}: MealsGridProps) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const tableWidth = NAME_COL_W + days.length * DAY_CELL_W + TOTAL_COL_W;
  const tableBodyHeight = (consumers.length + 1) * DAY_CELL_H + 4;

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  if (consumers.length === 0) return <MealsEmptyState />;

  return (
    <View className="flex-1 overflow-hidden bg-white">
      <View className="h-[40px] flex-row border-b border-slate-200">
        <ScrollView
          ref={headerScrollRef}
          horizontal
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          onScroll={onHeaderScroll}
          scrollEventThrottle={16}
          className="flex-1"
          contentContainerClassName="flex-row"
          contentContainerStyle={{ width: tableWidth }}
        >
          <View className="h-[40px] w-[110px] bg-[#08766E]" />
          {days.map((day) => (
            <View
              key={day}
              className={`h-[40px] w-[48px] items-center justify-center border-l border-white/10 ${
                isMealDayToday(yearMonth, day) ? "bg-teal-500" : "bg-[#08766E]"
              }`}
            >
              <Text className="font-inter-semibold text-xs text-white">
                {day}
              </Text>
            </View>
          ))}
          <View className="h-[40px] w-[54px] items-center justify-center bg-[#0A5954]">
            <Text className="font-inter-bold text-[11px] text-white">
              Total
            </Text>
          </View>
        </ScrollView>
        <View
          pointerEvents="none"
          className="absolute left-0 top-0 z-30 h-[40px] w-[110px] items-center justify-center border-r border-white/20 bg-[#08766E] shadow-md shadow-black/10"
        >
          <View className="absolute left-[-4px] top-[19px] h-px w-[118px] rotate-[20deg] bg-white/70" />
          <Text className="absolute right-2 top-1 font-inter-semibold text-[10px] text-white">
            Date
          </Text>
          <Text className="absolute bottom-1 left-2 font-inter-semibold text-[10px] text-white">
            Consumers
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === "android"}
        keyboardShouldPersistTaps="always"
        contentContainerClassName={
          Platform.OS === "web" ? "pb-[118px]" : "pb-safe-offset-[49px]"
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={MEAL_TOTAL_DARK}
            colors={[MEAL_TOTAL_DARK]}
          />
        }
      >
        <View
          className="w-full"
          style={{ height: tableBodyHeight }}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            if (width > 0 && Math.abs(width - viewportWidth) > 0.5) {
              onViewportWidthChange(width);
            }
          }}
        >
          <ScrollView
            ref={bodyScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
            alwaysBounceHorizontal={false}
            overScrollMode="never"
            onScroll={onBodyScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="always"
            contentContainerClassName="flex-col"
            contentContainerStyle={{ width: tableWidth }}
            style={{ width: "100%", height: tableBodyHeight }}
          >
            {consumers.map((consumer, index) => {
              const counts = days.map((day) =>
                getMealCount(yearMonth, consumer.id, day),
              );
              return (
                <MealRow
                  key={consumer.id}
                  consumer={consumer}
                  index={index}
                  days={days}
                  counts={counts}
                  total={getConsumerTotal(yearMonth, consumer.id)}
                  selectedDay={
                    selectedCell?.consumerId === consumer.id
                      ? selectedCell.day
                      : null
                  }
                  isAdmin={isAdmin}
                  tableWidth={tableWidth}
                  yearMonth={yearMonth}
                  onCellPress={onCellPress}
                />
              );
            })}

            <View
              className="h-[52px] flex-row bg-[#08766E]"
              style={{ width: tableWidth }}
            >
              <View className="h-[52px] w-[110px] border-r border-white/20" />
              {days.map((day) => (
                <View
                  key={day}
                  className="h-[52px] w-[48px] items-center justify-center border-l border-white/10"
                >
                  <Text className="font-inter-semibold text-xs text-white">
                    {formatMealValue(getDayTotal(yearMonth, day))}
                  </Text>
                </View>
              ))}
              <View className="h-[52px] w-[54px] items-center justify-center bg-[#0A5954]">
                <Text className="font-inter-bold text-[15px] text-white">
                  {formatMealValue(getGrandTotal(yearMonth))}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View
            pointerEvents="box-none"
            className="absolute left-0 top-0 z-30 w-[110px] shadow-md shadow-black/10"
          >
            {consumers.map((consumer, index) => (
              <TouchableOpacity
                key={consumer.id}
                disabled={!isAdmin}
                className={`h-[48px] w-[110px] flex-row items-center border-b-[0.5px] border-r border-slate-200 px-3 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"
                }`}
                onLongPress={() => onRemoveConsumer(consumer.id, consumer.name)}
                activeOpacity={isAdmin ? 0.7 : 1}
              >
                <Text
                  className="flex-1 font-inter-semibold text-[13px]"
                  style={{ color: getConsumerNameColor(consumer.id) }}
                  numberOfLines={1}
                >
                  {consumer.name}
                </Text>
              </TouchableOpacity>
            ))}
            <View className="h-[52px] w-[110px] items-center justify-center border-r border-white/20 bg-[#08766E]">
              <Text className="font-inter-bold text-xs text-white">Total</Text>
            </View>
          </View>
        </View>
        <View
          pointerEvents="none"
          style={{
            height:
              Platform.OS === "web"
                ? 96
                : keyboardHeight > 0
                  ? keyboardHeight + 72
                  : 96,
          }}
        />
      </ScrollView>
    </View>
  );
};
