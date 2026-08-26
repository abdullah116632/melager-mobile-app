import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  EXPENSE_AMOUNT_COLUMN_WIDTH,
  EXPENSE_DAY_COLUMN_WIDTH,
  EXPENSE_PRIMARY,
} from "@/constants/expense";
import { useAuth, useMess } from "@/redux/hooks";
import { formatExpenseAmount, isExpenseDayToday } from "@/utils/expense";
import { ExpenseDetailModal } from "./ExpenseDetailModal";
import { ExpenseEditorModal } from "./ExpenseEditorModal";

export const ExpensesTable = () => {
  const { role } = useAuth();
  const {
    currentYearMonth,
    currentMonthLoaded,
    dataLoading,
    getExpense,
    getMonthExpenseTotal,
    getDaysInMonth,
    refreshMonth,
  } = useMess();
  const [refreshing, setRefreshing] = useState(false);
  const [viewingDay, setViewingDay] = useState<number | null>(null);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const isAdmin = role === "admin";
  const isMonthReady = currentMonthLoaded && !dataLoading;
  const days = Array.from(
    { length: getDaysInMonth(currentYearMonth) },
    (_, index) => index + 1,
  );
  const monthTotal = isMonthReady ? getMonthExpenseTotal(currentYearMonth) : 0;
  const amountColumnRight =
    EXPENSE_DAY_COLUMN_WIDTH + EXPENSE_AMOUNT_COLUMN_WIDTH;
  const recordedDays = isMonthReady
    ? days.filter((day) => getExpense(currentYearMonth, day).items.length > 0)
        .length
    : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshMonth().catch(() => {});
    setRefreshing(false);
  };

  const openEditor = (day: number) => {
    if (!isAdmin || !isMonthReady) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setEditingItemId(null);
    setEditingDay(day);
  };

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
          {days.map((day, index) => {
            const expense = getExpense(currentYearMonth, day);
            const hasData = isMonthReady && expense.items.length > 0;
            const isToday = isExpenseDayToday(currentYearMonth, day);
            const itemSummary = isMonthReady
              ? expense.items
                  .map((item) => item.name)
                  .filter(Boolean)
                  .join(", ")
              : "";

            return (
              <View
                key={day}
                className={`min-h-[50px] flex-row items-center border-b border-slate-300 ${isToday ? "border-l-[3px] border-l-teal-500 bg-[#DDF7F2]" : index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
              >
                <View
                  className="shrink-0 items-center justify-center py-2"
                  style={{ width: EXPENSE_DAY_COLUMN_WIDTH }}
                >
                  <Text
                    className={`text-sm ${isToday ? "font-inter-bold text-[#0A5954]" : "font-inter-medium text-slate-900"}`}
                  >
                    {day}
                  </Text>
                  {isToday && (
                    <Text className="mt-px font-inter-semibold text-[9px] text-teal-700">
                      Today
                    </Text>
                  )}
                </View>

                <View
                  className="shrink-0 items-end justify-center py-2 pr-2.5"
                  style={{ width: EXPENSE_AMOUNT_COLUMN_WIDTH }}
                >
                  {!isMonthReady ? (
                    <Text className="font-inter text-[13px] text-slate-300">
                      -
                    </Text>
                  ) : hasData ? (
                    <Text className="font-inter-semibold text-[13px] text-[#0A5954]">
                      ৳{formatExpenseAmount(expense.total)}
                    </Text>
                  ) : (
                    <Text className="font-inter text-[13px] text-slate-500">
                      —
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  className="flex-1 justify-center px-3 py-2"
                  onPress={() => setViewingDay(day)}
                  disabled={!isMonthReady}
                  activeOpacity={0.7}
                >
                  {!isMonthReady ? (
                    <View className="h-2.5 w-24 rounded-full bg-slate-200" />
                  ) : hasData ? (
                    <View className="flex-row items-center gap-1.5">
                      <Text
                        className="flex-1 font-inter text-[13px] text-slate-900"
                        numberOfLines={1}
                      >
                        {itemSummary ||
                          `${expense.items.length} item${expense.items.length !== 1 ? "s" : ""}`}
                      </Text>
                      <View className="min-w-[22px] items-center rounded-[10px] border border-teal-700/10 bg-slate-100 px-1.5 py-0.5">
                        <Text className="font-inter-bold text-[11px] text-[#0A5954]">
                          {expense.items.length}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text className="font-inter text-[13px] text-slate-500">
                      No Expenses
                    </Text>
                  )}
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity
                    className={`ml-1.5 mr-2.5 h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-teal-700 ${isMonthReady ? "opacity-100" : "opacity-40"}`}
                    onPress={() => openEditor(day)}
                    disabled={!isMonthReady}
                    activeOpacity={0.8}
                    hitSlop={6}
                    accessibilityLabel={`Edit expenses for day ${day}`}
                  >
                    <Feather name="plus" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

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
              <Text className="font-inter-bold text-[15px] text-white">
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
