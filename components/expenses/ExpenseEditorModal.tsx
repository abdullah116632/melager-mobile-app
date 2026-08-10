import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { EXPENSE_PRIMARY } from "@/constants/expense";
import type { useColors } from "@/hooks/useColors";
import type { ExpenseDraftItem } from "@/types/expense";
import { formatExpenseAmount } from "@/utils/expense";
import { expenseStyles as styles } from "./expenseStyles";

interface ExpenseEditorModalProps {
  visible: boolean;
  day: number | null;
  monthLabel: string;
  drafts: ExpenseDraftItem[];
  total: number;
  colors: ReturnType<typeof useColors>;
  onClose: () => void;
  onSave: () => void;
  onAddItem: () => void;
  onNameChange: (id: string, name: string) => void;
  onAmountChange: (id: string, amount: string) => void;
  onRemoveItem: (id: string) => void;
}

export const ExpenseEditorModal = ({
  visible,
  day,
  monthLabel,
  drafts,
  total,
  colors,
  onClose,
  onSave,
  onAddItem,
  onNameChange,
  onAmountChange,
  onRemoveItem,
}: ExpenseEditorModalProps) => {
  const amountInputRefs = useRef<Record<string, TextInput | null>>({});
  const firstNameInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!visible) return;
    const focusTimer = setTimeout(
      () => firstNameInputRef.current?.focus(),
      350,
    );
    return () => clearTimeout(focusTimer);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalSpacer}
            activeOpacity={1}
            onPress={onSave}
          />
          <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                  Day {day} — {monthLabel}
                </Text>
                {total > 0 && (
                  <Text
                    style={[styles.sheetSubtotal, { color: EXPENSE_PRIMARY }]}
                  >
                    Total: ৳{formatExpenseAmount(total)}
                  </Text>
                )}
              </View>
              <View style={styles.sheetHeaderActions}>
                <TouchableOpacity
                  style={[
                    styles.clearButton,
                    { backgroundColor: colors.secondary },
                  ]}
                  onPress={onClose}
                  accessibilityLabel="Close expense form"
                >
                  <Feather name="x" size={19} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.itemColumnLabels,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.itemColumnLabel,
                  styles.itemNameColumnLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Item Name
              </Text>
              <Text
                style={[
                  styles.itemColumnLabel,
                  styles.itemAmountColumnLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                Amount (৳)
              </Text>
              <View style={styles.itemActionColumnLabel} />
            </View>

            <ScrollView
              style={styles.itemsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {drafts.map((item, index) => (
                <View
                  key={item.id}
                  style={[styles.itemRow, { borderBottomColor: colors.border }]}
                >
                  <TextInput
                    ref={index === 0 ? firstNameInputRef : undefined}
                    style={[
                      styles.itemNameInput,
                      {
                        color: colors.foreground,
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder={`Item ${index + 1}`}
                    placeholderTextColor={colors.mutedForeground}
                    value={item.name}
                    onChangeText={(name) => onNameChange(item.id, name)}
                    returnKeyType="next"
                    autoFocus={index === drafts.length - 1 && index > 0}
                    onSubmitEditing={() =>
                      amountInputRefs.current[item.id]?.focus()
                    }
                    blurOnSubmit={false}
                  />

                  <View
                    style={[
                      styles.itemAmountWrapper,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.currencySign, { color: EXPENSE_PRIMARY }]}
                    >
                      ৳
                    </Text>
                    <TextInput
                      ref={(input) => {
                        amountInputRefs.current[item.id] = input;
                      }}
                      style={[
                        styles.itemAmountInput,
                        { color: colors.foreground },
                      ]}
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                      value={item.amountString}
                      onChangeText={(amount) => onAmountChange(item.id, amount)}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      selectTextOnFocus
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.itemDeleteButton}
                    onPress={() => onRemoveItem(item.id)}
                    hitSlop={8}
                    accessibilityLabel={`Remove item ${index + 1}`}
                  >
                    <Feather
                      name="x-circle"
                      size={20}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addItemButton, { borderColor: EXPENSE_PRIMARY }]}
                onPress={onAddItem}
              >
                <Feather name="plus" size={16} color={EXPENSE_PRIMARY} />
                <Text style={[styles.addItemText, { color: EXPENSE_PRIMARY }]}>
                  Add item
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: EXPENSE_PRIMARY }]}
              onPress={onSave}
            >
              {total > 0 && (
                <Text style={styles.saveButtonSubtext}>
                  ৳{formatExpenseAmount(total)}
                </Text>
              )}
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
