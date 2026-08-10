import Feather from "@expo/vector-icons/Feather";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { EXPENSE_DARK, EXPENSE_PRIMARY } from "@/constants/expense";
import type { useColors } from "@/hooks/useColors";
import type { DayExpenseSummary } from "@/types/expense";
import { formatExpenseAmount } from "@/utils/expense";
import { expenseStyles as styles } from "./expenseStyles";

interface ExpenseDetailModalProps {
  visible: boolean;
  day: number | null;
  expense: DayExpenseSummary | null;
  colors: ReturnType<typeof useColors>;
  isAdmin: boolean;
  onClose: () => void;
  onDeleteItem: (id: string) => void;
  onDeleteAll: () => void;
}

export const ExpenseDetailModal = ({
  visible,
  day,
  expense,
  colors,
  isAdmin,
  onClose,
  onDeleteItem,
  onDeleteAll,
}: ExpenseDetailModalProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <TouchableOpacity
        style={styles.modalSpacer}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.detailSheet, { backgroundColor: colors.card }]}>
        <View
          style={[styles.sheetHandle, { backgroundColor: colors.border }]}
        />
        <View style={styles.sheetHeader}>
          <View>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Expenses · Day {day}
            </Text>
            <Text style={[styles.sheetSubtotal, { color: EXPENSE_PRIMARY }]}>
              ৳{formatExpenseAmount(expense?.total ?? 0)}
            </Text>
          </View>
          <View style={styles.sheetHeaderActions}>
            {isAdmin && (expense?.items.length ?? 0) > 0 && (
              <TouchableOpacity
                style={[styles.clearButton, styles.deleteAllButton]}
                onPress={onDeleteAll}
                accessibilityLabel="Delete all expenses for this day"
              >
                <Feather name="trash-2" size={16} color="#DC2626" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.clearButton,
                { backgroundColor: colors.secondary },
              ]}
              onPress={onClose}
              accessibilityLabel="Close expense list"
            >
              <Feather name="x" size={19} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {expense?.items.length ? (
          <ScrollView
            style={styles.detailList}
            showsVerticalScrollIndicator={false}
          >
            {expense.items.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.detailItemRow,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.detailItemIcon,
                    { backgroundColor: "#F0FDFA" },
                  ]}
                >
                  <Feather name="tag" size={15} color={EXPENSE_PRIMARY} />
                </View>
                <Text
                  style={[styles.detailItemName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {item.name || "Untitled item"}
                </Text>
                <Text
                  style={[styles.detailItemAmount, { color: EXPENSE_DARK }]}
                >
                  ৳{formatExpenseAmount(item.amount)}
                </Text>
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.detailItemDeleteButton}
                    onPress={() => onDeleteItem(item.id)}
                    accessibilityLabel={`Delete ${item.name || "expense item"}`}
                  >
                    <Feather name="trash-2" size={16} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.detailEmptyState}>
            <Feather
              name="file-text"
              size={28}
              color={colors.mutedForeground}
            />
            <Text
              style={[
                styles.detailEmptyText,
                { color: colors.mutedForeground },
              ]}
            >
              No expense items for this day.
            </Text>
          </View>
        )}
      </View>
    </View>
  </Modal>
);
