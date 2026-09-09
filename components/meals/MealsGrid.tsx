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
import { useAppDispatch, useAuth, useMeals, useNetwork } from "@/redux/hooks";
import { offlineActionFailed } from "@/redux/slice/networkSlice";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import type { ActiveMealCell } from "@/types/meal";
import { formatMealValue, getTodayDayInMonth } from "@/utils/meal";
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

// Rows are the unbounded axis — a mess can hold any number of members — so only
// they are windowed. The off-screen rows are replaced by one spacer of exactly
// the height they would have occupied, which keeps every scroll offset and the
// sticky name column where they were.
//
// Day columns are deliberately NOT windowed. A month is only ever 28-31 columns
// wide, and swapping them in and out as the grid scrolls sideways cost more than
// it saved: the header is a separate ScrollView kept in sync with `scrollTo`, so
// changing its children made Android re-layout it and lose that offset, and a
// fast fling outran the JS thread and showed empty cells. Columns are staged in
// instead (see MOUNTED_COLUMN_*), which keeps the first paint cheap without ever
// removing a column once it is on screen.
// Sized for headroom rather than for the smallest possible window: a row
// entering the window costs 31 cells, and a hard fling can cross ~75 rows per
// second, so the buffer has to cover the time React needs to catch up. Ten rows
// is a little over 500px, which is ~130ms at fling speed. Raise it if empty rows
// ever appear mid-fling in a large mess; lower it only to save memory.
const ROW_OVERSCAN = 10;

// Rows snap to blocks of this size so scrolling only re-renders every few rows
// rather than on every crossed row boundary.
const WINDOW_BLOCK = 3;

// The first paint only builds this many day columns; the rest arrive over the
// next few frames. Opening the tab is what felt slow, and this keeps that first
// frame small without changing what the grid eventually renders.
const INITIAL_COLUMN_MOUNT = 10;
const COLUMN_MOUNT_STEP = 11;

interface ItemWindow {
  start: number;
  end: number;
}

const computeWindow = (
  offset: number,
  extent: number,
  itemSize: number,
  overscan: number,
): ItemWindow => {
  const firstVisible = Math.floor(offset / itemSize);
  const lastVisible = Math.ceil((offset + extent) / itemSize);
  return {
    start: Math.max(
      0,
      Math.floor((firstVisible - overscan) / WINDOW_BLOCK) * WINDOW_BLOCK,
    ),
    end: Math.ceil((lastVisible + overscan) / WINDOW_BLOCK) * WINDOW_BLOCK,
  };
};

const clampWindow = (window: ItemWindow, count: number): ItemWindow => {
  const start = Math.min(Math.max(0, window.start), count);
  return { start, end: Math.min(Math.max(start, window.end), count) };
};

const isSameWindow = (a: ItemWindow, b: ItemWindow) =>
  a.start === b.start && a.end === b.end;

export const MealsGrid = forwardRef<MealsGridHandle, MealsGridProps>(
  ({ selectedCell, onCellPress }, ref) => {
    const { width: windowWidth } = useWindowDimensions();
    const dispatch = useAppDispatch();
    const { role } = useAuth();
    const { isOnline } = useNetwork();
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
    const [viewportHeight, setViewportHeight] = useState(
      () => Dimensions.get("window").height,
    );
    const [rawRowWindow, setRawRowWindow] = useState<ItemWindow>(() =>
      computeWindow(
        0,
        Dimensions.get("window").height,
        DAY_CELL_H,
        ROW_OVERSCAN,
      ),
    );
    const [mountedColumnCount, setMountedColumnCount] =
      useState(INITIAL_COLUMN_MOUNT);
    const rowWindowRef = useRef(rawRowWindow);
    const daysCount = getDaysInMonth(yearMonth);
    const dayCellWidth = Math.min(
      DAY_CELL_W,
      Math.max(40, Math.floor((viewportWidth - NAME_COL_W) / 6)),
    );
    const days = useMemo(
      () => Array.from({ length: daysCount }, (_, index) => index + 1),
      [daysCount],
    );
    // Deliberately not memoised: the old per-cell check also re-read the clock
    // on every render, and one `Date` per render is already ~680x fewer.
    const todayDay = getTodayDayInMonth(yearMonth);
    const isMonthReady = currentMonthLoaded && !dataLoading;
    const displayedRowCount = isMonthReady
      ? consumers.length
      : PLACEHOLDER_ROW_COUNT;
    const tableWidth = NAME_COL_W + days.length * dayCellWidth + TOTAL_COL_W;
    const tableBodyHeight = displayedRowCount * DAY_CELL_H + 52;

    const rowWindow = clampWindow(rawRowWindow, displayedRowCount);
    const leadingRowHeight = rowWindow.start * DAY_CELL_H;
    const trailingRowHeight = (displayedRowCount - rowWindow.end) * DAY_CELL_H;

    // Header and footer always render the full month so their child lists never
    // change; only the data rows are staged, and only while filling in.
    const mountedDays = useMemo(
      () =>
        mountedColumnCount >= daysCount
          ? days
          : days.slice(0, mountedColumnCount),
      [days, daysCount, mountedColumnCount],
    );
    const pendingDayWidth = (daysCount - mountedDays.length) * dayCellWidth;
    const extraVerticalScrollSpace =
      Platform.OS === "web"
        ? 96
        : Math.max(240, Dimensions.get("screen").height * 0.5);

    // Re-rendering on every scroll frame would cost more than it saves, so the
    // window is only pushed to state when the visible slice actually changes.
    const updateRowWindow = useCallback((offsetY: number, extent: number) => {
      const next = computeWindow(offsetY, extent, DAY_CELL_H, ROW_OVERSCAN);
      if (isSameWindow(next, rowWindowRef.current)) return;
      rowWindowRef.current = next;
      setRawRowWindow(next);
    }, []);

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

    // One tap target for the whole grid instead of one per cell. Every cell is
    // the same size, so the pressed cell is just arithmetic on the coordinates,
    // which arrive relative to the wrapper this is attached to — inside the
    // scrolled content, so no scroll offset has to be added back.
    const cellTap = useMemo(
      () =>
        Gesture.Tap()
          // Reanimated is installed, so gesture callbacks are workletised and
          // run on the UI thread by default. This one dispatches Redux state,
          // so it has to stay on the JS thread.
          .runOnJS(true)
          .onEnd((event, success) => {
            if (!success || !isAdmin || !isMonthReady) return;
            const column = Math.floor((event.x - NAME_COL_W) / dayCellWidth);
            const row = Math.floor(event.y / DAY_CELL_H);
            if (column < 0 || column >= daysCount) return;
            const consumer = consumers[row];
            if (!consumer) return;
            onCellPress(consumer.id, column + 1);
          }),
      [consumers, dayCellWidth, daysCount, isAdmin, isMonthReady, onCellPress],
    );

    const handleRefresh = useCallback(async () => {
      setRefreshing(true);
      try {
        if (!isOnline) {
          dispatch(offlineActionFailed("refresh"));
          return;
        }
        await refreshMonth();
      } catch {
        // Saved SQLite data remains visible if the remote refresh fails.
      } finally {
        setRefreshing(false);
      }
    }, [dispatch, isOnline, refreshMonth]);

    // Fill the remaining columns in over the following frames, so the month is
    // complete well before anyone can scroll sideways but the first frame is
    // not paying for all 31 of them.
    useEffect(() => {
      if (mountedColumnCount >= daysCount) return;
      const handle = requestAnimationFrame(() => {
        setMountedColumnCount((current) =>
          Math.min(daysCount, current + COLUMN_MOUNT_STEP),
        );
      });
      return () => cancelAnimationFrame(handle);
    }, [daysCount, mountedColumnCount]);

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
                  day === todayDay ? "bg-teal-500" : "bg-[#08766E]"
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
              Members
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
          onLayout={(event) => {
            const height = event.nativeEvent.layout.height;
            if (height > 0 && Math.abs(height - viewportHeight) > 0.5) {
              setViewportHeight(height);
              updateRowWindow(verticalScrollYRef.current, height);
            }
          }}
          onScroll={(event) => {
            const { contentOffset, layoutMeasurement } = event.nativeEvent;
            const y = Math.max(0, contentOffset.y);
            verticalScrollYRef.current = y;
            updateRowWindow(y, layoutMeasurement.height);
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
              <GestureDetector gesture={cellTap}>
                <View style={{ width: tableWidth }}>
                  {leadingRowHeight > 0 ? (
                    <View style={{ height: leadingRowHeight }} />
                  ) : null}
                  {isMonthReady
                    ? consumers
                        .slice(rowWindow.start, rowWindow.end)
                        .map((consumer, offset) => {
                          const counts = mountedDays.map((day) =>
                            getMealCount(yearMonth, consumer.id, day),
                          );
                          return (
                            <MealGridRow
                              key={consumer.id}
                              consumer={consumer}
                              index={rowWindow.start + offset}
                              days={mountedDays}
                              counts={counts}
                              total={getConsumerTotal(yearMonth, consumer.id)}
                              selectedDay={
                                selectedCell?.consumerId === consumer.id
                                  ? selectedCell.day
                                  : null
                              }
                              tableWidth={tableWidth}
                              dayCellWidth={dayCellWidth}
                              trailingWidth={pendingDayWidth}
                              yearMonth={yearMonth}
                              todayDay={todayDay}
                            />
                          );
                        })
                    : PLACEHOLDER_ROWS.slice(
                        rowWindow.start,
                        rowWindow.end,
                      ).map((row) => (
                        <View
                          key={row}
                          className={`h-[52px] flex-row border-b-[0.5px] border-slate-200 ${
                            row % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"
                          }`}
                          style={{ width: tableWidth }}
                        >
                          <View className="h-[52px] w-[110px] border-r border-slate-200" />
                          {mountedDays.map((day) => (
                            <View
                              key={day}
                              className={`h-[52px] items-center justify-center border-r-[0.5px] border-slate-200 ${
                                day === todayDay
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
                          {pendingDayWidth > 0 ? (
                            <View
                              className="h-[52px]"
                              style={{ width: pendingDayWidth }}
                            />
                          ) : null}
                          <View className="h-[52px] w-[54px] items-center justify-center bg-slate-100">
                            <Text className="font-inter-bold text-sm text-slate-300">
                              -
                            </Text>
                          </View>
                        </View>
                      ))}
                  {trailingRowHeight > 0 ? (
                    <View style={{ height: trailingRowHeight }} />
                  ) : null}
                </View>
              </GestureDetector>

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
              rowStart={rowWindow.start}
              rowEnd={rowWindow.end}
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
