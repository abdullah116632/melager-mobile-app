import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useCallback, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExpenseDetailModal } from "@/components/expenses/ExpenseDetailModal";
import { ExpenseEditorModal } from "@/components/expenses/ExpenseEditorModal";
import { ExpensesHeader } from "@/components/expenses/ExpensesHeader";
import { ExpensesTable } from "@/components/expenses/ExpensesTable";
import MonthPicker from "@/components/MonthPicker";
import { EXPENSE_PRIMARY } from "@/constants/expense";
import { useAuth } from "@/context/AuthContext";
import { useDrawer } from "@/context/DrawerContext";
import { useMess } from "@/context/MessContext";
import type { ExpenseDraftItem } from "@/types/expense";
import {
  createExpenseDraftItem,
  getExpenseDraftTotal,
  toExpenseDraftItems,
  toExpenseItems,
} from "@/utils/expense";

export const ExpensesScreen = () => {
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
    setDraftItems(drafts.length > 0 ? drafts : [createExpenseDraftItem()]);
    // Keep the same order as the working deposit flow: prepare the form first,
    // then show the modal so its first input exists when auto-focus runs.
    setEditingDay(day);
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

  return (
    <View
      className={`flex-1 bg-[#F4F8FC] ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
    >
      <StatusBar style="light" backgroundColor="#075F5B" />
      {Platform.OS !== "web" && (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-0 z-50 bg-[#075F5B]"
          style={{ height: insets.top }}
        />
      )}
      <ExpensesHeader
        monthTotal={monthTotal}
        isAdmin={isAdmin}
        onMenu={openDrawer}
      />
      <MonthPicker accentColor={EXPENSE_PRIMARY} variant="dashboard" />
      <ExpensesTable
        yearMonth={currentYearMonth}
        days={days}
        monthTotal={monthTotal}
        isAdmin={isAdmin}
        refreshing={refreshing}
        getExpense={getExpense}
        onRefresh={() => void handleRefresh()}
        onViewDay={setViewingDay}
        onEditDay={openEditor}
      />
      <ExpenseDetailModal
        visible={viewingDay !== null}
        day={viewingDay}
        expense={viewedExpense}
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
