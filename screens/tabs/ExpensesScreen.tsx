import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpenseDetailModal } from "@/components/expenses/ExpenseDetailModal";
import { ExpenseEditorModal } from "@/components/expenses/ExpenseEditorModal";
import { expenseStyles as styles } from "@/components/expenses/expenseStyles";
import { ExpensesHeader } from "@/components/expenses/ExpensesHeader";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import MonthPicker from "@/components/MonthPicker";
import { EXPENSE_PRIMARY } from "@/constants/expense";
import { useAuth } from "@/context/AuthContext";
import { useDrawer } from "@/context/DrawerContext";
import { useMess } from "@/context/MessContext";
import { useColors } from "@/hooks/useColors";
import type { ExpenseDraftItem } from "@/types/expense";
import {
  createExpenseDraftItem,
  getExpenseDraftTotal,
  toExpenseDraftItems,
  toExpenseItems,
} from "@/utils/expense";

export const ExpensesScreen = () => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const { openDrawer } = useDrawer();
  const {
    currentYearMonth,
    currentMonthLabel,
    getExpense,
    setExpense,
    getMonthExpenseTotal,
    getDaysInMonth,
    refreshMonth,
  } = useMess();
  const [refreshing, setRefreshing] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [viewingDay, setViewingDay] = useState<number | null>(null);
  const [draftItems, setDraftItems] = useState<ExpenseDraftItem[]>([]);

  const isAdmin = role === "admin";
  const days = Array.from(
    { length: getDaysInMonth(currentYearMonth) },
    (_, index) => index + 1,
  );
  const monthTotal = getMonthExpenseTotal(currentYearMonth);
  const draftTotal = getExpenseDraftTotal(draftItems);
  const viewedExpense =
    viewingDay === null ? null : getExpense(currentYearMonth, viewingDay);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshMonth().catch(() => {});
    setRefreshing(false);
  }, [refreshMonth]);

  const openEditor = (day: number) => {
    if (!isAdmin) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    const expense = getExpense(currentYearMonth, day);
    const drafts = toExpenseDraftItems(expense.items);
    setEditingDay(day);
    setDraftItems(drafts.length > 0 ? drafts : [createExpenseDraftItem()]);
  };

  const closeEditor = () => {
    setEditingDay(null);
    setDraftItems([]);
  };

  const saveExpenses = () => {
    if (editingDay === null) return;
    setExpense(currentYearMonth, editingDay, toExpenseItems(draftItems));
    closeEditor();
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const deleteExpenseItem = (itemId: string) => {
    if (!isAdmin || viewingDay === null) return;
    Alert.alert("Delete item", "Remove this expense item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const current = getExpense(currentYearMonth, viewingDay);
          setExpense(
            currentYearMonth,
            viewingDay,
            current.items.filter((item) => item.id !== itemId),
          );
        },
      },
    ]);
  };

  const deleteAllExpenseItems = () => {
    if (!isAdmin || viewingDay === null) return;
    Alert.alert(
      "Delete all expenses",
      "Remove every expense item for this day?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete all",
          style: "destructive",
          onPress: () => setExpense(currentYearMonth, viewingDay, []),
        },
      ],
    );
  };

  const addDraftItem = () => {
    setDraftItems((current) => [...current, createExpenseDraftItem()]);
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  };

  const updateDraft = (
    itemId: string,
    updates: Partial<Pick<ExpenseDraftItem, "name" | "amountString">>,
  ) => {
    setDraftItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    );
  };

  const removeDraftItem = (itemId: string) => {
    setDraftItems((current) => {
      const remaining = current.filter((item) => item.id !== itemId);
      return remaining.length > 0 ? remaining : [createExpenseDraftItem()];
    });
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 118 : insets.bottom + 49;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPadding },
      ]}
    >
      <ExpensesHeader
        monthTotal={monthTotal}
        isAdmin={isAdmin}
        onMenu={openDrawer}
      />
      <MonthPicker accentColor={EXPENSE_PRIMARY} />
      <ExpensesTable
        colors={colors}
        yearMonth={currentYearMonth}
        days={days}
        monthTotal={monthTotal}
        isAdmin={isAdmin}
        refreshing={refreshing}
        bottomPadding={bottomPadding}
        getExpense={getExpense}
        onRefresh={() => void handleRefresh()}
        onViewDay={setViewingDay}
        onEditDay={openEditor}
      />
      <ExpenseDetailModal
        visible={viewingDay !== null}
        day={viewingDay}
        expense={viewedExpense}
        colors={colors}
        isAdmin={isAdmin}
        onClose={() => setViewingDay(null)}
        onDeleteItem={deleteExpenseItem}
        onDeleteAll={deleteAllExpenseItems}
      />
      <ExpenseEditorModal
        visible={editingDay !== null}
        day={editingDay}
        monthLabel={currentMonthLabel}
        drafts={draftItems}
        total={draftTotal}
        colors={colors}
        onClose={closeEditor}
        onSave={saveExpenses}
        onAddItem={addDraftItem}
        onNameChange={(itemId, name) => updateDraft(itemId, { name })}
        onAmountChange={(itemId, amountString) =>
          updateDraft(itemId, { amountString })
        }
        onRemoveItem={removeDraftItem}
      />
    </View>
  );
};
