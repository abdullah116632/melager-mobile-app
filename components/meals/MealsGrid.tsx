import Feather from "@expo/vector-icons/Feather";
import { useRef, type RefObject } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
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

interface MealsGridProps {
  consumers: Consumer[];
  yearMonth: string;
  days: number[];
  isAdmin: boolean;
  activeCell: ActiveMealCell | null;
  selectedCell: ActiveMealCell | null;
  inputValue: string;
  fillMode: boolean;
  refreshing: boolean;
  viewportWidth: number;
  onViewportWidthChange: (width: number) => void;
  headerScrollRef: RefObject<ScrollView | null>;
  bodyScrollRef: RefObject<ScrollView | null>;
  outerScrollRef: RefObject<ScrollView | null>;
  activeCellInputRef: RefObject<TextInput | null>;
  getMealCount: (yearMonth: string, consumerId: string, day: number) => number;
  getConsumerTotal: (yearMonth: string, consumerId: string) => number;
  getDayTotal: (yearMonth: string, day: number) => number;
  getGrandTotal: (yearMonth: string) => number;
  onHeaderScroll: () => void;
  onBodyScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onOuterScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onRefresh: () => void;
  onInputChange: (value: string) => void;
  onInputBlur: () => void;
  onSubmitEditing: () => void;
  onFillHandlePress: () => void;
  onCellPress: (consumerId: string, day: number) => void;
  onRemoveConsumer: (consumerId: string, consumerName: string) => void;
  onFillDrag: (consumerId: string, locationX: number) => void;
}

export const MealsGrid = ({
  consumers,
  yearMonth,
  days,
  isAdmin,
  activeCell,
  selectedCell,
  inputValue,
  fillMode,
  refreshing,
  viewportWidth,
  onViewportWidthChange,
  headerScrollRef,
  bodyScrollRef,
  outerScrollRef,
  activeCellInputRef,
  getMealCount,
  getConsumerTotal,
  getDayTotal,
  getGrandTotal,
  onHeaderScroll,
  onBodyScroll,
  onOuterScroll,
  onRefresh,
  onInputChange,
  onInputBlur,
  onSubmitEditing,
  onFillHandlePress,
  onCellPress,
  onRemoveConsumer,
  onFillDrag,
}: MealsGridProps) => {
  const fillHandleScale = useRef(new Animated.Value(1)).current;
  const tableWidth = NAME_COL_W + days.length * DAY_CELL_W + TOTAL_COL_W;
  const tableBodyHeight = (consumers.length + 1) * DAY_CELL_H + 4;

  if (consumers.length === 0) return <MealsEmptyState />;

  const animateFillHandle = (
    scale: number,
    speed: number,
    bounciness: number,
  ) =>
    Animated.spring(fillHandleScale, {
      toValue: scale,
      useNativeDriver: false,
      speed,
      bounciness,
    }).start();

  const fillAtTouchPosition = (locationX: number, locationY: number) => {
    const rowIndex = Math.max(0, Math.floor(locationY / DAY_CELL_H));
    const consumerId = consumers[Math.min(rowIndex, consumers.length - 1)]?.id;
    if (consumerId) onFillDrag(consumerId, locationX);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 overflow-hidden bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
          <View className="h-[40px] w-[110px] items-center justify-center bg-[#08766E] px-1.5" />
          {days.map((day) => (
            <View
              key={day}
              className={`h-[40px] w-[48px] items-center justify-center border-l border-white/10 ${isMealDayToday(yearMonth, day) ? "bg-teal-500" : "bg-[#08766E]"}`}
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
        ref={outerScrollRef}
        onScroll={onOuterScroll}
        scrollEventThrottle={16}
        automaticallyAdjustKeyboardInsets={false}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName={
          Platform.OS === "web" ? "pb-[118px]" : "pb-safe-offset-[49px]"
        }
        keyboardShouldPersistTaps="handled"
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
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!fillMode}
            contentContainerClassName="flex-col"
            contentContainerStyle={{ width: tableWidth }}
            style={{ width: "100%", height: tableBodyHeight }}
          >
            {consumers.map((consumer, index) => (
              <View
                key={consumer.id}
                className={`h-[48px] flex-row border-b-[0.5px] border-slate-200 ${index % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"}`}
                style={{ width: tableWidth }}
              >
                <View className="h-[48px] w-[110px] justify-center border-r border-slate-200 px-2" />
                {days.map((day) => {
                  const count = getMealCount(yearMonth, consumer.id, day);
                  const isToday = isMealDayToday(yearMonth, day);
                  const isActive =
                    activeCell?.consumerId === consumer.id &&
                    activeCell.day === day;
                  const isSelected =
                    !isActive &&
                    selectedCell?.consumerId === consumer.id &&
                    selectedCell.day === day;

                  if (isActive) {
                    return (
                      <View
                        key={day}
                        className="relative z-10 h-[48px] w-[48px] items-stretch justify-center overflow-visible border-2 border-teal-700 bg-[#E5FAF3]"
                      >
                        <TextInput
                          ref={activeCellInputRef}
                          value={inputValue}
                          onChangeText={onInputChange}
                          onBlur={onInputBlur}
                          onSubmitEditing={onSubmitEditing}
                          keyboardType="number-pad"
                          returnKeyType="next"
                          className="flex-1 py-0 pl-0.5 pr-4 text-center font-inter-semibold text-sm text-teal-700"
                          maxLength={2}
                          selectTextOnFocus
                        />
                        {isAdmin && (
                          <TouchableOpacity
                            activeOpacity={0.7}
                            hitSlop={8}
                            className="absolute bottom-0 right-0 z-30 h-4 w-4 items-center justify-center"
                            onPressIn={() => {
                              onFillHandlePress();
                              animateFillHandle(0.85, 40, 4);
                            }}
                            onPressOut={() => animateFillHandle(1, 24, 8)}
                          >
                            <Animated.View
                              pointerEvents="none"
                              className="h-4 w-4 items-center justify-center rounded border border-teal-700 bg-white shadow-sm shadow-teal-700"
                              style={{
                                transform: [{ scale: fillHandleScale }],
                              }}
                            >
                              <Feather name="copy" size={10} color="#0F766E" />
                            </Animated.View>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={day}
                      className={`h-[48px] w-[48px] items-center justify-center overflow-visible ${count > 0 ? "bg-[#E5FAF3]" : ""} ${fillMode ? "bg-[#DDF8F0]" : ""} ${isSelected ? "border-2 border-teal-700" : `border-r-[0.5px] border-slate-200 ${isToday ? "border-b-2 border-b-teal-500" : ""}`}`}
                      onPress={() => onCellPress(consumer.id, day)}
                      activeOpacity={isAdmin ? (fillMode ? 0.5 : 0.65) : 1}
                    >
                      <Text
                        className={`text-[13px] ${count > 0 ? "font-inter-bold text-teal-700" : "font-inter text-slate-500"}`}
                      >
                        {count > 0 ? count.toString() : "-"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <View className="h-[48px] w-[54px] items-center justify-center bg-slate-100">
                  <Text className="font-inter-bold text-sm text-teal-700">
                    {getConsumerTotal(yearMonth, consumer.id)}
                  </Text>
                </View>
              </View>
            ))}

            <View
              className="h-[52px] flex-row bg-[#08766E]"
              style={{ width: tableWidth }}
            >
              <View className="h-[52px] w-[110px] items-center justify-center border-r border-white/20" />
              {days.map((day) => {
                const total = getDayTotal(yearMonth, day);
                return (
                  <View
                    key={day}
                    className="h-[52px] w-[48px] items-center justify-center border-l border-white/10"
                  >
                    <Text className="font-inter-semibold text-xs text-white">
                      {total > 0 ? total.toString() : "-"}
                    </Text>
                  </View>
                );
              })}
              <View className="h-[52px] w-[54px] items-center justify-center bg-[#0A5954]">
                <Text className="font-inter-bold text-[15px] text-white">
                  {getGrandTotal(yearMonth)}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View
            pointerEvents="box-none"
            className="absolute left-0 top-0 z-30 w-[110px] shadow-md shadow-black/10"
          >
            {consumers.map((consumer, index) => {
              const nameColor = getConsumerNameColor(consumer.id);
              return (
                <TouchableOpacity
                  key={consumer.id}
                  className={`h-[48px] w-[110px] flex-row items-center border-b-[0.5px] border-r border-slate-200 px-3 ${index % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"}`}
                  onLongPress={() =>
                    onRemoveConsumer(consumer.id, consumer.name)
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    className="flex-1 font-inter-semibold text-[13px]"
                    style={{ color: nameColor }}
                    numberOfLines={1}
                  >
                    {consumer.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <View className="h-[52px] w-[110px] items-center justify-center border-r border-white/20 bg-[#08766E]">
              <Text className="font-inter-bold text-xs text-white">Total</Text>
            </View>
          </View>

          {fillMode && isAdmin && (
            <View
              className="absolute left-0 top-0 z-10"
              style={{
                width: tableWidth,
                height: tableBodyHeight,
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) =>
                fillAtTouchPosition(
                  event.nativeEvent.locationX,
                  event.nativeEvent.locationY,
                )
              }
              onResponderMove={(event) =>
                fillAtTouchPosition(
                  event.nativeEvent.locationX,
                  event.nativeEvent.locationY,
                )
              }
            />
          )}
        </View>
        <View pointerEvents="none" className="h-80" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
