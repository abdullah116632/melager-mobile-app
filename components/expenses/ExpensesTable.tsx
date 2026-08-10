import Feather from "@expo/vector-icons/Feather";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  EXPENSE_ACCENT,
  EXPENSE_AMOUNT_COLUMN_WIDTH,
  EXPENSE_DARK,
  EXPENSE_DAY_COLUMN_WIDTH,
  EXPENSE_PRIMARY,
  EXPENSE_ROW_HEIGHT,
} from "@/constants/expense";
import type { useColors } from "@/hooks/useColors";
import type { DayExpenseSummary } from "@/types/expense";
import { formatExpenseAmount, isExpenseDayToday } from "@/utils/expense";
import { expenseStyles as styles } from "./expenseStyles";

interface ExpensesTableProps {
  colors: ReturnType<typeof useColors>;
  yearMonth: string;
  days: number[];
  monthTotal: number;
  isAdmin: boolean;
  refreshing: boolean;
  bottomPadding: number;
  getExpense: (yearMonth: string, day: number) => DayExpenseSummary;
  onRefresh: () => void;
  onViewDay: (day: number) => void;
  onEditDay: (day: number) => void;
}

export const ExpensesTable = ({
  colors,
  yearMonth,
  days,
  monthTotal,
  isAdmin,
  refreshing,
  bottomPadding,
  getExpense,
  onRefresh,
  onViewDay,
  onEditDay,
}: ExpensesTableProps) => {
  const recordedDays = days.filter(
    (day) => getExpense(yearMonth, day).items.length > 0,
  ).length;

  return (
    <>
      <View style={[styles.columnHeader, { backgroundColor: EXPENSE_DARK }]}>
        <View
          style={[styles.dayHeaderCell, { width: EXPENSE_DAY_COLUMN_WIDTH }]}
        >
          <Text style={styles.columnHeaderText}>Day</Text>
        </View>
        <View
          style={[
            styles.amountHeaderCell,
            { width: EXPENSE_AMOUNT_COLUMN_WIDTH },
          ]}
        >
          <Text style={styles.columnHeaderText}>Total (৳)</Text>
        </View>
        <View style={styles.itemsHeaderCell}>
          <Text style={styles.columnHeaderText}>Items</Text>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={EXPENSE_PRIMARY}
            colors={[EXPENSE_PRIMARY]}
          />
        }
      >
        <View style={styles.tableBody}>
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
                style={[
                  styles.row,
                  {
                    backgroundColor: isToday
                      ? "#DDF7F2"
                      : index % 2 === 0
                        ? colors.card
                        : colors.rowAlt,
                    borderBottomColor: "#CBD5E1",
                    borderLeftWidth: isToday ? 3 : 0,
                    borderLeftColor: EXPENSE_ACCENT,
                    minHeight: EXPENSE_ROW_HEIGHT,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dayColumn,
                    { width: EXPENSE_DAY_COLUMN_WIDTH },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isToday ? EXPENSE_DARK : colors.foreground },
                      isToday && styles.todayText,
                    ]}
                  >
                    {day}
                  </Text>
                  {isToday && (
                    <Text
                      style={[styles.todayLabel, { color: EXPENSE_PRIMARY }]}
                    >
                      Today
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.amountColumn,
                    { width: EXPENSE_AMOUNT_COLUMN_WIDTH },
                  ]}
                >
                  {hasData ? (
                    <Text
                      style={[
                        styles.amountText,
                        styles.amountValue,
                        { color: EXPENSE_DARK },
                      ]}
                    >
                      ৳{formatExpenseAmount(expense.total)}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.amountText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      —
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.itemsColumn}
                  onPress={() => onViewDay(day)}
                  activeOpacity={0.7}
                >
                  {hasData ? (
                    <View style={styles.itemsPreviewRow}>
                      <Text
                        style={[
                          styles.itemsPreviewText,
                          { color: colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {itemSummary ||
                          `${expense.items.length} item${expense.items.length !== 1 ? "s" : ""}`}
                      </Text>
                      <View
                        style={[
                          styles.itemCountBadge,
                          { backgroundColor: colors.secondary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.itemCountText,
                            { color: EXPENSE_DARK },
                          ]}
                        >
                          {expense.items.length}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.tapHint,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Tap to add
                    </Text>
                  )}
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity
                    style={[
                      styles.rowAddButton,
                      { backgroundColor: EXPENSE_PRIMARY },
                    ]}
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

          <View style={[styles.totalRow, { backgroundColor: EXPENSE_DARK }]}>
            <View
              style={[styles.dayColumn, { width: EXPENSE_DAY_COLUMN_WIDTH }]}
            >
              <Text style={styles.totalLabel}>Total</Text>
            </View>
            <View
              style={[
                styles.amountColumn,
                { width: EXPENSE_AMOUNT_COLUMN_WIDTH },
              ]}
            >
              <Text style={styles.totalAmountText}>
                ৳{formatExpenseAmount(monthTotal) || "0"}
              </Text>
            </View>
            <View style={styles.itemsColumn}>
              <Text style={styles.totalDaysText}>
                {recordedDays} days recorded
              </Text>
            </View>
          </View>
          <View
            pointerEvents="none"
            style={[styles.columnDivider, { left: EXPENSE_DAY_COLUMN_WIDTH }]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.columnDivider,
              {
                left: EXPENSE_DAY_COLUMN_WIDTH + EXPENSE_AMOUNT_COLUMN_WIDTH,
              },
            ]}
          />
        </View>
      </ScrollView>
    </>
  );
};
