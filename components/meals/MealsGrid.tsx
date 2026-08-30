import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
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
import { useAuth } from "@/redux/hooks";
import { useMeals } from "@/redux/hooks";
import type { ActiveMealCell } from "@/types/meal";
import { formatMealValue, isMealDayToday } from "@/utils/meal";
import { MealGridRow } from "./MealGridRow";
import { MealsConsumerColumn } from "./MealsConsumerColumn";
import { MealsEmptyState } from "./MealsEmptyState";

export interface MealsGridHandle {
  keepDayVisible: (day: number) => void;
  preserveVerticalPosition: () => void;
}

interface MealsGridProps {
  selectedCell: ActiveMealCell | null;
  onCellPress: (consumerId: string, day: number) => void;
}

const PLACEHOLDER_ROW_COUNT = 8;
const PLACEHOLDER_ROWS = Array.from(
  { length: PLACEHOLDER_ROW_COUNT },
  (_, index) => index,
);

export const MealsGrid = forwardRef<MealsGridHandle, MealsGridProps>(
  ({ selectedCell, onCellPress }, ref) => {
    const { width: windowWidth } = useWindowDimensions();
    const { role } = useAuth();
    const {
      consumers,
      currentYearMonth: yearMonth,
      currentMonthLoaded,
      dataLoading,
      getMealCount,
      getConsumerTotal,
      getDayTotal,
      getGrandTotal,
      getDaysInMonth,
      refreshMonth,
    } = useMeals();
    const isAdmin = role === "admin";
    const [refreshing, setRefreshing] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(windowWidth);
    const headerScrollRef = useRef<ScrollView | null>(null);
    const verticalScrollRef = useRef<ScrollView | null>(null);
    const bodyScrollRef = useRef<ScrollView | null>(null);
    const bodyScrollXRef = useRef(0);
    const verticalScrollYRef = useRef(0);
    const preservedVerticalScrollYRef = useRef<number | null>(null);
    const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isSyncingRef = useRef(false);
    const daysCount = getDaysInMonth(yearMonth);
    const dayCellWidth = Math.min(
      DAY_CELL_W,
      Math.max(40, Math.floor((viewportWidth - NAME_COL_W) / 6)),
    );
    const days = useMemo(
      () => Array.from({ length: daysCount }, (_, index) => index + 1),
      [daysCount],
    );
    const isMonthReady = currentMonthLoaded && !dataLoading;
    const displayedRowCount = isMonthReady
      ? consumers.length
      : PLACEHOLDER_ROW_COUNT;
    const tableWidth = NAME_COL_W + days.length * dayCellWidth + TOTAL_COL_W;
    const tableBodyHeight = displayedRowCount * DAY_CELL_H + 52;
    const extraVerticalScrollSpace =
      Platform.OS === "web"
        ? 96
        : Math.max(240, Dimensions.get("screen").height * 0.5);

    const handleBodyScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, layoutMeasurement } = event.nativeEvent;
        const maximumX = Math.max(0, tableWidth - layoutMeasurement.width);
        const x = Math.min(Math.max(contentOffset.x, 0), maximumX);
        bodyScrollXRef.current = x;
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        headerScrollRef.current?.scrollTo({ x, animated: false });
        requestAnimationFrame(() => {
          isSyncingRef.current = false;
        });
      },
      [tableWidth],
    );

    const keepDayVisible = useCallback(
      (day: number) => {
        const currentX = bodyScrollXRef.current;
        const cellLeft = NAME_COL_W + (day - 1) * dayCellWidth;
        const cellRight = cellLeft + dayCellWidth;
        const visibleLeft = currentX + NAME_COL_W;
        const visibleRight = currentX + viewportWidth - TOTAL_COL_W;
        let nextX = currentX;
        if (cellLeft < visibleLeft) {
          nextX = Math.max(0, cellLeft - NAME_COL_W);
        } else if (cellRight > visibleRight) {
          nextX = Math.min(
            Math.max(0, tableWidth - viewportWidth),
            cellRight - viewportWidth + TOTAL_COL_W,
          );
        }
        if (Math.abs(nextX - currentX) > 0.5) {
          bodyScrollXRef.current = nextX;
          bodyScrollRef.current?.scrollTo({ x: nextX, animated: true });
          headerScrollRef.current?.scrollTo({ x: nextX, animated: true });
        }
      },
      [dayCellWidth, tableWidth, viewportWidth],
    );

    const restoreVerticalPosition = useCallback(() => {
      const y = preservedVerticalScrollYRef.current;
      if (y === null) return;
      requestAnimationFrame(() => {
        verticalScrollRef.current?.scrollTo({ y, animated: false });
      });
    }, []);

    const preserveVerticalPosition = useCallback(() => {
      preservedVerticalScrollYRef.current = verticalScrollYRef.current;
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = setTimeout(() => {
        restoreVerticalPosition();
        preservedVerticalScrollYRef.current = null;
        restoreTimerRef.current = null;
      }, 450);
    }, [restoreVerticalPosition]);

    useImperativeHandle(
      ref,
      () => ({ keepDayVisible, preserveVerticalPosition }),
      [keepDayVisible, preserveVerticalPosition],
    );

    const handleRefresh = useCallback(async () => {
      setRefreshing(true);
      await refreshMonth().catch(() => {});
      setRefreshing(false);
    }, [refreshMonth]);

    useEffect(() => {
      const showSubscription = Keyboard.addListener(
        "keyboardDidShow",
        restoreVerticalPosition,
      );
      return () => {
        showSubscription.remove();
        if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      };
    }, [restoreVerticalPosition]);

    if (isMonthReady && consumers.length === 0) return <MealsEmptyState />;

    return (
      <View className="flex-1 overflow-hidden bg-white">
        <View className="h-[40px] flex-row border-b border-slate-200">
          <ScrollView
            ref={headerScrollRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            className="flex-1"
            contentContainerClassName="flex-row"
            contentContainerStyle={{ width: tableWidth }}
          >
            <View className="h-[40px] w-[110px] bg-[#08766E]" />
            {days.map((day) => (
              <View
                key={day}
                className={`h-[40px] items-center justify-center border-l border-white/10 ${
                  isMealDayToday(yearMonth, day)
                    ? "bg-teal-500"
                    : "bg-[#08766E]"
                }`}
                style={{ width: dayCellWidth }}
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
          ref={verticalScrollRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === "android"}
          keyboardShouldPersistTaps="always"
          automaticallyAdjustKeyboardInsets={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            verticalScrollYRef.current = Math.max(
              0,
              event.nativeEvent.contentOffset.y,
            );
          }}
          contentContainerClassName={
            Platform.OS === "web" ? "pb-[118px]" : "pb-safe-offset-[49px]"
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
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
                setViewportWidth(width);
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
              onScroll={handleBodyScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="always"
              contentContainerClassName="flex-col"
              contentContainerStyle={{ width: tableWidth }}
              style={{ width: "100%", height: tableBodyHeight }}
            >
              {isMonthReady
                ? consumers.map((consumer, index) => {
                    const counts = days.map((day) =>
                      getMealCount(yearMonth, consumer.id, day),
                    );
                    return (
                      <MealGridRow
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
                        dayCellWidth={dayCellWidth}
                        yearMonth={yearMonth}
                        onCellPress={onCellPress}
                      />
                    );
                  })
                : PLACEHOLDER_ROWS.map((row) => (
                    <View
                      key={row}
                      className={`h-[52px] flex-row border-b-[0.5px] border-slate-200 ${
                        row % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"
                      }`}
                      style={{ width: tableWidth }}
                    >
                      <View className="h-[52px] w-[110px] border-r border-slate-200" />
                      {days.map((day) => (
                        <View
                          key={day}
                          className={`h-[52px] items-center justify-center border-r-[0.5px] border-slate-200 ${
                            isMealDayToday(yearMonth, day)
                              ? "border-b-2 border-b-teal-500"
                              : ""
                          }`}
                          style={{ width: dayCellWidth }}
                        >
                          <Text className="font-inter text-[13px] text-slate-300">
                            -
                          </Text>
                        </View>
                      ))}
                      <View className="h-[52px] w-[54px] items-center justify-center bg-slate-100">
                        <Text className="font-inter-bold text-sm text-slate-300">
                          -
                        </Text>
                      </View>
                    </View>
                  ))}

              <View
                className="h-[52px] flex-row bg-[#08766E]"
                style={{ width: tableWidth }}
              >
                <View className="h-[52px] w-[110px] border-r border-white/20" />
                {days.map((day) => (
                  <View
                    key={day}
                        className="h-[52px] items-center justify-center border-l border-white/10"
                        style={{ width: dayCellWidth }}
                  >
                    <Text className="font-inter-semibold text-xs text-white">
                      {formatMealValue(
                        isMonthReady ? getDayTotal(yearMonth, day) : 0,
                      )}
                    </Text>
                  </View>
                ))}
                <View className="h-[52px] w-[54px] items-center justify-center bg-[#0A5954]">
                  <Text className="font-inter-bold text-[15px] text-white">
                    {formatMealValue(
                      isMonthReady ? getGrandTotal(yearMonth) : 0,
                    )}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <MealsConsumerColumn
              loading={!isMonthReady}
              placeholderCount={PLACEHOLDER_ROW_COUNT}
            />
          </View>
          <View
            pointerEvents="none"
            style={{ height: extraVerticalScrollSpace }}
          />
        </ScrollView>
      </View>
    );
  },
);

MealsGrid.displayName = "MealsGrid";
