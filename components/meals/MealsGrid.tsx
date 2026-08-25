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
import { useMess } from "@/redux/hooks";
import type { ActiveMealCell } from "@/types/meal";
import { formatMealValue, isMealDayToday } from "@/utils/meal";
import { MealGridRow } from "./MealGridRow";
import { MealsConsumerColumn } from "./MealsConsumerColumn";
import { MealsEmptyState } from "./MealsEmptyState";

export interface MealsGridHandle {
  keepDayVisible: (day: number) => void;
}

interface MealsGridProps {
  selectedCell: ActiveMealCell | null;
  onCellPress: (consumerId: string, day: number) => void;
}

export const MealsGrid = forwardRef<MealsGridHandle, MealsGridProps>(
  ({ selectedCell, onCellPress }, ref) => {
    const { width: windowWidth } = useWindowDimensions();
    const { role } = useAuth();
    const {
      consumers,
      currentYearMonth: yearMonth,
      getMealCount,
      getConsumerTotal,
      getDayTotal,
      getGrandTotal,
      getDaysInMonth,
      refreshMonth,
    } = useMess();
    const isAdmin = role === "admin";
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(windowWidth);
    const headerScrollRef = useRef<ScrollView | null>(null);
    const bodyScrollRef = useRef<ScrollView | null>(null);
    const bodyScrollXRef = useRef(0);
    const isSyncingRef = useRef(false);
    const daysCount = getDaysInMonth(yearMonth);
    const days = useMemo(
      () => Array.from({ length: daysCount }, (_, index) => index + 1),
      [daysCount],
    );
    const tableWidth = NAME_COL_W + days.length * DAY_CELL_W + TOTAL_COL_W;
    const tableBodyHeight = (consumers.length + 1) * DAY_CELL_H + 4;

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
        const cellLeft = NAME_COL_W + (day - 1) * DAY_CELL_W;
        const cellRight = cellLeft + DAY_CELL_W;
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
      [tableWidth, viewportWidth],
    );

    useImperativeHandle(ref, () => ({ keepDayVisible }), [keepDayVisible]);

    const handleRefresh = useCallback(async () => {
      setRefreshing(true);
      await refreshMonth().catch(() => {});
      setRefreshing(false);
    }, [refreshMonth]);

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
                  isMealDayToday(yearMonth, day)
                    ? "bg-teal-500"
                    : "bg-[#08766E]"
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
              {consumers.map((consumer, index) => {
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

            <MealsConsumerColumn />
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
  },
);

MealsGrid.displayName = "MealsGrid";
