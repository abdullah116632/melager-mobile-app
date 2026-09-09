import * as Haptics from "expo-haptics";
import { useCallback, useMemo, useState } from "react";
import { Platform, RefreshControl, ScrollView, Text, View } from "react-native";
import {
  EXPENSE_AMOUNT_COLUMN_WIDTH,
  EXPENSE_DAY_COLUMN_WIDTH,
  EXPENSE_PRIMARY,
} from "@/constants/expense";
import {
  useAppDispatch,
  useAuth,
  useExpenses,
  useNetwork,
} from "@/redux/hooks";
import { offlineActionFailed } from "@/redux/slice/networkSlice";
import { formatExpenseAmount } from "@/utils/expense";
import { getTodayDayInMonth } from "@/utils/monthDay";
import { ExpenseDetailModal } from "./ExpenseDetailModal";
import { ExpenseEditorModal } from "./ExpenseEditorModal";
import { ExpenseRow } from "./ExpenseRow";

export const ExpensesTable = () => {
  const dispatch = useAppDispatch();
  const { role } = useAuth();
  const { isOnline } = useNetwork();
  const {
    currentYearMonth,
    currentMonthLoaded,
    dataLoading,
    getExpense,
    getMonthExpenseTotal,
    getDaysInMonth,
    refreshMonth,
  } = useExpenses();
  const [refreshing, setRefreshing] = useState(false);
  const [viewingDay, setViewingDay] = useState<number | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const isAdmin = role === "admin";
  const isMonthReady = currentMonthLoaded && !dataLoading;
  const daysInMonth = getDaysInMonth(currentYearMonth);
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, index) => index + 1),
    [daysInMonth],
  );
  // Resolved once per render instead of once per row. Not memoised, so it stays
  // exactly as fresh as the old per-row clock read.
  const todayDay = getTodayDayInMonth(currentYearMonth);
  const monthTotal = isMonthReady ? getMonthExpenseTotal(currentYearMonth) : 0;
  const amountColumnRight =
    EXPENSE_DAY_COLUMN_WIDTH + EXPENSE_AMOUNT_COLUMN_WIDTH;
  const recordedDays = useMemo(
    () =>
      isMonthReady
        ? days.filter(
            (day) => getExpense(currentYearMonth, day).items.length > 0,
          ).length
        : 0,
    [currentYearMonth, days, getExpense, isMonthReady],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (!isOnline) {
        dispatch(offlineActionFailed("refresh"));
        return;
      }
      await refreshMonth();
    } catch {
      // The shared month state retains saved data and reports API errors.
    } finally {
      setRefreshing(false);
    }
  };

  // Stable so a row only re-renders when its own day's data changes.
  const openEditor = useCallback(
    (day: number) => {
      if (!isAdmin || !isMonthReady) return;
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      setEditingItemId(null);
      setEditingDay(day);
    },
    [isAdmin, isMonthReady],
  );

  const openDetail = useCallback((day: number) => setViewingDay(day), []);

  const closeEditor = () => {
    setEditingDay(null);
    setEditingItemId(null);
  };

  const openItemEditor = (itemId: string) => {
    if (viewingDay === null) return;
    openEditor(viewingDay);
    setEditingItemId(itemId);
    setViewingDay(null);
  };

  return (
    <>
      <View className="h-[38px] flex-row items-center bg-[#0A5954]">
        <View
          className="shrink-0 items-center justify-center"
          style={{ width: EXPENSE_DAY_COLUMN_WIDTH }}
        >
          <Text className="font-inter-semibold text-xs text-white">Day</Text>
        </View>
        <View
          className="shrink-0 items-center justify-center border-l border-white/40"
          style={{ width: EXPENSE_AMOUNT_COLUMN_WIDTH }}
        >
          <Text className="font-inter-semibold text-xs text-white">
            Total (৳)
          </Text>
        </View>
        <View className="flex-1 justify-center border-l border-white/40 px-3">
          <Text className="font-inter-semibold text-xs text-white">Items</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerClassName={
          Platform.OS === "web" ? "pb-[118px]" : "pb-safe-offset-[49px]"
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={EXPENSE_PRIMARY}
            colors={[EXPENSE_PRIMARY]}
          />
        }
      >
        <View className="relative">
          {days.map((day, index) => (
            <ExpenseRow
              key={day}
              day={day}
              index={index}
              expense={getExpense(currentYearMonth, day)}
              isMonthReady={isMonthReady}
              isToday={day === todayDay}
              isAdmin={isAdmin}
              onView={openDetail}
              onAdd={openEditor}
            />
          ))}

          <View className="h-[50px] flex-row items-center bg-[#0A5954]">
            <View
              className="shrink-0 items-center justify-center py-2"
              style={{ width: EXPENSE_DAY_COLUMN_WIDTH }}
            >
              <Text className="font-inter-bold text-[13px] text-white">
                Total
              </Text>
            </View>
            <View
              className="shrink-0 items-end justify-center py-2 pr-2.5"
              style={{ width: EXPENSE_AMOUNT_COLUMN_WIDTH }}
            >
              <Text
                className="font-inter-bold text-[15px] text-white"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                ৳{formatExpenseAmount(monthTotal) || "0"}
              </Text>
            </View>
            <View className="flex-1 justify-center px-3 py-2">
              <Text className="px-3 font-inter text-xs text-white/75">
                {recordedDays} days recorded
              </Text>
            </View>
          </View>
          <View
            pointerEvents="none"
            className="absolute bottom-0 top-0 z-[5] w-px bg-slate-300"
            style={{ left: EXPENSE_DAY_COLUMN_WIDTH }}
          />
          <View
            pointerEvents="none"
            className="absolute bottom-0 top-0 z-[5] w-px bg-slate-300"
            style={{ left: amountColumnRight }}
          />
        </View>
      </ScrollView>
      <ExpenseDetailModal
        day={viewingDay}
        onClose={() => setViewingDay(null)}
        onEditItem={openItemEditor}
      />
      <ExpenseEditorModal
        day={editingDay}
        focusItemId={editingItemId}
        onClose={closeEditor}
      />
    </>
  );
};
