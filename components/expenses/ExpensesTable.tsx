import Feather from "@expo/vector-icons/Feather";
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
import type { DayExpenseSummary } from "@/types/expense";
import { formatExpenseAmount, isExpenseDayToday } from "@/utils/expense";

interface ExpensesTableProps {
  yearMonth: string;
  days: number[];
  monthTotal: number;
  isAdmin: boolean;
  refreshing: boolean;
  getExpense: (yearMonth: string, day: number) => DayExpenseSummary;
  onRefresh: () => void;
  onViewDay: (day: number) => void;
  onEditDay: (day: number) => void;
}

export const ExpensesTable = ({
  yearMonth,
  days,
  monthTotal,
  isAdmin,
  refreshing,
  getExpense,
  onRefresh,
  onViewDay,
  onEditDay,
}: ExpensesTableProps) => {
  const amountColumnRight =
    EXPENSE_DAY_COLUMN_WIDTH + EXPENSE_AMOUNT_COLUMN_WIDTH;
  const recordedDays = days.filter(
    (day) => getExpense(yearMonth, day).items.length > 0,
  ).length;

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
            onRefresh={onRefresh}
            tintColor={EXPENSE_PRIMARY}
            colors={[EXPENSE_PRIMARY]}
          />
        }
      >
        <View className="relative">
          {days.map((day, index) => {
            const expense = getExpense(yearMonth, day);
            const hasData = expense.items.length > 0;
            const isToday = isExpenseDayToday(yearMonth, day);
            const itemSummary = expense.items
              .map((item) => item.name)
              .filter(Boolean)
              .join(", ");

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
                  {hasData ? (
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
                  onPress={() => onViewDay(day)}
                  activeOpacity={0.7}
                >
                  {hasData ? (
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
                      Click plus icon to add
                    </Text>
                  )}
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity
                    className="ml-1.5 mr-2.5 h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-teal-700"
                    onPress={() => onEditDay(day)}
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
    </>
  );
};
