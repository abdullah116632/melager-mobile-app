import Feather from "@expo/vector-icons/Feather";
import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  EXPENSE_AMOUNT_COLUMN_WIDTH,
  EXPENSE_DAY_COLUMN_WIDTH,
} from "@/constants/expense";
import type { DayExpenseItem } from "@/types/mess";
import { formatExpenseAmount } from "@/utils/expense";

export interface ExpenseRowData {
  items: DayExpenseItem[];
  conflictMessage: string | null;
  total: number;
}

interface ExpenseRowProps {
  day: number;
  index: number;
  expense: ExpenseRowData;
  isMonthReady: boolean;
  isToday: boolean;
  isAdmin: boolean;
  onView: (day: number) => void;
  onAdd: (day: number) => void;
}

/**
 * One day of the expense table.
 *
 * Split out of `ExpensesTable` so opening a modal — which only changes that
 * table's own state — no longer rebuilds all 31 rows. The comparator below
 * comes down to the item array's identity, which Redux keeps stable for the
 * days an edit did not touch, so a single day's change re-renders one row.
 */
export const ExpenseRow = memo(
  ({
    day,
    index,
    expense,
    isMonthReady,
    isToday,
    isAdmin,
    onView,
    onAdd,
  }: ExpenseRowProps) => {
    const hasData = isMonthReady && expense.items.length > 0;
    const itemSummary = isMonthReady
      ? expense.items
          .map((item) => item.name)
          .filter(Boolean)
          .join(", ")
      : "";

    return (
      <View
        className={`min-h-[52px] flex-row items-center border-b border-slate-300 ${isToday ? "border-l-[3px] border-l-teal-500 bg-[#DDF7F2]" : index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
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

        <TouchableOpacity
          className="shrink-0 items-end justify-center py-2 pr-2.5"
          style={{ width: EXPENSE_AMOUNT_COLUMN_WIDTH }}
          onPress={() => onView(day)}
          disabled={!isMonthReady}
          activeOpacity={0.7}
        >
          {!isMonthReady ? (
            <Text className="font-inter text-[13px] text-slate-300">-</Text>
          ) : hasData ? (
            <Text
              className="font-inter-semibold text-[13px] text-[#0A5954]"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              ৳{formatExpenseAmount(expense.total)}
            </Text>
          ) : (
            <Text className="font-inter text-[13px] text-slate-500">৳0</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="min-w-0 flex-1 justify-center px-3 py-2"
          onPress={() => onView(day)}
          disabled={!isMonthReady}
          activeOpacity={0.7}
        >
          {!isMonthReady ? (
            <View className="h-2.5 w-24 rounded-full bg-slate-200" />
          ) : expense.conflictMessage && !hasData ? (
            <View className="flex-row items-center gap-1.5">
              <Feather name="alert-triangle" size={14} color="#D97706" />
              <Text className="font-inter-semibold text-xs text-amber-700">
                Sync conflict
              </Text>
            </View>
          ) : hasData ? (
            <View className="flex-row items-center gap-1.5">
              {expense.conflictMessage ? (
                <Feather name="alert-triangle" size={14} color="#D97706" />
              ) : null}
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
            <Text
              className="font-inter text-xs italic text-slate-500"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              No expenses
            </Text>
          )}
        </TouchableOpacity>

        {isAdmin && (
          <TouchableOpacity
            className={`ml-1.5 mr-2.5 h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-teal-700 ${isMonthReady ? "opacity-100" : "opacity-40"}`}
            onPress={() => onAdd(day)}
            disabled={!isMonthReady}
            activeOpacity={0.8}
            hitSlop={6}
            accessibilityLabel={`Add expense for day ${day}`}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  },
  (previous, next) =>
    previous.day === next.day &&
    previous.index === next.index &&
    previous.isMonthReady === next.isMonthReady &&
    previous.isToday === next.isToday &&
    previous.isAdmin === next.isAdmin &&
    previous.onView === next.onView &&
    previous.onAdd === next.onAdd &&
    previous.expense.items === next.expense.items &&
    previous.expense.total === next.expense.total &&
    previous.expense.conflictMessage === next.expense.conflictMessage,
);

ExpenseRow.displayName = "ExpenseRow";
