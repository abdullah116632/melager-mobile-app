import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
import { useKeyboardSheetOffset } from "@/hooks/useKeyboardSheetOffset";
import { useExpenses } from "@/redux/hooks";
import type { ExpenseDraftItem } from "@/types/expense";
import {
  createExpenseDraftItem,
  formatExpenseAmount,
  getExpenseDraftTotal,
  toExpenseDraftItems,
  toExpenseItems,
} from "@/utils/expense";

interface ExpenseEditorModalProps {
  day: number | null;
  focusItemId?: string | null;
  onClose: () => void;
}

export const ExpenseEditorModal = ({
  day,
  focusItemId,
  onClose,
}: ExpenseEditorModalProps) => {
  const { currentYearMonth, currentMonthLabel, getExpense, setExpense } =
    useExpenses();
  const [drafts, setDrafts] = useState<ExpenseDraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const keyboardOffset = useKeyboardSheetOffset();
  const amountInputRefs = useRef<Record<string, TextInput | null>>({});
  const nameInputRefs = useRef<Record<string, TextInput | null>>({});
  const hasFocusedForSession = useRef(false);
  const visible = day !== null;
  const total = getExpenseDraftTotal(drafts);
  const firstDraftId = drafts[0]?.id;

  useEffect(() => {
    if (day === null) {
      setDrafts([]);
      setError("");
      return;
    }

    if (!focusItemId) {
      setDrafts([createExpenseDraftItem()]);
      setError("");
      return;
    }

    const nextDrafts = toExpenseDraftItems(
      getExpense(currentYearMonth, day).items,
    );
    setDrafts(nextDrafts.length > 0 ? nextDrafts : [createExpenseDraftItem()]);
    setError("");
  }, [currentYearMonth, day, focusItemId]);

  useEffect(() => {
    if (!visible) {
      hasFocusedForSession.current = false;
      return;
    }
    const targetItemId = focusItemId ?? firstDraftId;
    if (!targetItemId || hasFocusedForSession.current) return;
    hasFocusedForSession.current = true;
    const timer = setTimeout(
      () => nameInputRefs.current[targetItemId]?.focus(),
      350,
    );
    return () => clearTimeout(timer);
  }, [firstDraftId, focusItemId, visible]);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  const save = async () => {
    Keyboard.dismiss();
    if (day === null) return;
    const items = toExpenseItems(drafts);
    if (items.length === 0) {
      setError("Add at least one expense item before saving.");
      return;
    }
    if (items.some((item) => !item.name.trim())) {
      setError("Every expense amount needs an item name.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const nextItems = focusItemId
        ? items
        : [...getExpense(currentYearMonth, day).items, ...items];
      await setExpense(currentYearMonth, day, nextItems);
      close();
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to save expense.",
      );
    } finally {
      setSaving(false);
    }
  };

  const addDraftItem = () => {
    setDrafts((current) => [...current, createExpenseDraftItem()]);
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  };

  const updateDraft = (
    itemId: string,
    updates: Partial<Pick<ExpenseDraftItem, "name" | "amountString">>,
  ) => {
    setDrafts((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item,
      ),
    );
  };

  const removeDraftItem = (itemId: string) => {
    setDrafts((current) => {
      const remaining = current.filter((item) => item.id !== itemId);
      return remaining.length > 0 ? remaining : [createExpenseDraftItem()];
    });
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 justify-end bg-black/45">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          />
          <View
            className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-6 pt-3"
            style={{
              marginBottom: keyboardOffset,
            }}
          >
            <View className="mb-4 h-1 w-11 self-center rounded-sm bg-slate-200" />

            <View className="mb-3.5 flex-row items-start justify-between">
              <View className="min-w-0 flex-1">
                <Text
                  className="font-inter-bold text-[17px] text-slate-900"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {`${focusItemId ? "Edit expenses" : "Add expense"} · Day ${day} · ${currentMonthLabel}`}
                </Text>
                {total > 0 && (
                  <Text className="mt-0.5 font-inter-semibold text-[13px] text-teal-700">
                    Total: ৳{formatExpenseAmount(total)}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100"
                  onPress={close}
                  accessibilityLabel="Close expense form"
                >
                  <Feather name="x" size={19} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="mb-1 flex-row items-center border-b border-slate-200 pb-2">
              <Text className="flex-1 font-inter-semibold text-[11px] text-slate-500">
                Item Name
              </Text>
              <Text className="w-[90px] text-right font-inter-semibold text-[11px] text-slate-500">
                Amount (৳)
              </Text>
              <View className="w-8" />
            </View>

            <ScrollView
              className="max-h-80"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {drafts.map((item, index) => (
                <View
                  key={item.id}
                  className="flex-row items-center gap-2 border-b-[0.5px] border-slate-200 py-[7px]"
                >
                  <TextInput
                    ref={(input) => {
                      nameInputRefs.current[item.id] = input;
                    }}
                    className="h-10 flex-1 rounded-[10px] border border-slate-200 bg-slate-50 px-2.5 font-inter text-sm text-slate-900"
                    placeholder={`Item ${index + 1}`}
                    placeholderTextColor="#64748B"
                    value={item.name}
                    onChangeText={(name) => updateDraft(item.id, { name })}
                    returnKeyType="next"
                    onSubmitEditing={() =>
                      amountInputRefs.current[item.id]?.focus()
                    }
                    blurOnSubmit={false}
                  />

                  <View className="h-10 w-[90px] flex-row items-center rounded-[10px] border border-slate-200 bg-slate-50 pl-2 pr-1">
                    <Text className="mr-0.5 font-inter-semibold text-sm text-teal-700">
                      ৳
                    </Text>
                    <TextInput
                      ref={(input) => {
                        amountInputRefs.current[item.id] = input;
                      }}
                      className="h-10 flex-1 p-0 font-inter-medium text-sm text-slate-900"
                      placeholder="0"
                      placeholderTextColor="#64748B"
                      value={item.amountString}
                      onChangeText={(amountString) => {
                        if (/^\d*(?:\.\d{0,3})?$/.test(amountString)) {
                          updateDraft(item.id, { amountString });
                        }
                      }}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>

                  <TouchableOpacity
                    className="w-8 items-center justify-center"
                    onPress={() => removeDraftItem(item.id)}
                    hitSlop={8}
                    accessibilityLabel={`Remove item ${index + 1}`}
                  >
                    <Feather name="x-circle" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                className="mt-3 flex-row items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-teal-700 bg-teal-700/[0.04] py-[11px]"
                onPress={addDraftItem}
              >
                <Feather name="plus" size={16} color={EXPENSE_PRIMARY} />
                <Text className="font-inter-semibold text-sm text-teal-700">
                  Add item
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {error ? (
              <Text className="mt-3 text-center font-inter-medium text-[12px] text-red-600">
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              className={`mt-4 flex-row items-center justify-center gap-2.5 rounded-[14px] bg-teal-700 py-[15px] shadow-md shadow-teal-700/20 ${saving ? "opacity-70" : ""}`}
              onPress={() => void save()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : null}
              <Text className="font-inter-bold text-base text-white">
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
