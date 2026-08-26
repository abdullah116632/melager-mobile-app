import Feather from "@expo/vector-icons/Feather";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { EXPENSE_PRIMARY } from "@/constants/expense";
import { useAuth, useExpenses } from "@/redux/hooks";
import { formatExpenseAmount } from "@/utils/expense";

interface ExpenseDetailModalProps {
  day: number | null;
  onClose: () => void;
  onEditItem: (id: string) => void;
}

export const ExpenseDetailModal = ({
  day,
  onClose,
  onEditItem,
}: ExpenseDetailModalProps) => {
  const { role } = useAuth();
  const { currentYearMonth, getExpense, setExpense } = useExpenses();
  const isAdmin = role === "admin";
  const expense = day === null ? null : getExpense(currentYearMonth, day);

  const deleteExpenseItem = (itemId: string) => {
    if (!isAdmin || day === null) return;
    Alert.alert("Delete item", "Remove this expense item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const current = getExpense(currentYearMonth, day);
          try {
            await setExpense(
              currentYearMonth,
              day,
              current.items.filter((item) => item.id !== itemId),
            );
          } catch (error) {
            Alert.alert(
              "Delete failed",
              error instanceof Error
                ? error.message
                : "Failed to delete expense.",
            );
          }
        },
      },
    ]);
  };

  const deleteAllExpenseItems = () => {
    if (!isAdmin || day === null) return;
    Alert.alert(
      "Delete all expenses",
      "Remove every expense item for this day?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete all",
          style: "destructive",
          onPress: async () => {
            try {
              await setExpense(currentYearMonth, day, []);
              onClose();
            } catch (error) {
              Alert.alert(
                "Delete failed",
                error instanceof Error
                  ? error.message
                  : "Failed to delete expenses.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={day !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/45">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="max-h-[72%] rounded-t-3xl bg-white px-5 pb-6 pt-3">
          <View className="mb-4 h-1 w-11 self-center rounded-sm bg-slate-200" />
          <View className="mb-3.5 flex-row items-start justify-between">
            <View>
              <Text className="font-inter-bold text-[17px] text-slate-900">
                Expenses · Day {day}
              </Text>
              <Text className="mt-0.5 font-inter-semibold text-[13px] text-teal-700">
                ৳{formatExpenseAmount(expense?.total ?? 0)}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {isAdmin && (expense?.items.length ?? 0) > 0 && (
                <TouchableOpacity
                  className="h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50"
                  onPress={deleteAllExpenseItems}
                  accessibilityLabel="Delete all expenses for this day"
                >
                  <Feather name="trash-2" size={16} color="#DC2626" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100"
                onPress={onClose}
                accessibilityLabel="Close expense list"
              >
                <Feather name="x" size={19} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {expense?.items.length ? (
            <ScrollView
              className="max-h-[360px]"
              showsVerticalScrollIndicator={false}
            >
              {expense.items.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center gap-2.5 border-b-[0.5px] border-slate-200 py-3"
                >
                  <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-teal-50">
                    <Feather name="tag" size={15} color={EXPENSE_PRIMARY} />
                  </View>
                  <Text
                    className="flex-1 font-inter-medium text-sm text-slate-900"
                    numberOfLines={1}
                  >
                    {item.name || "Untitled item"}
                  </Text>
                  <Text className="font-inter-bold text-sm text-[#0A5954]">
                    ৳{formatExpenseAmount(item.amount)}
                  </Text>
                  {isAdmin && (
                    <View className="ml-0.5 flex-row items-center gap-1.5">
                      <TouchableOpacity
                        className="h-8 w-8 items-center justify-center rounded-full bg-teal-50"
                        onPress={() => onEditItem(item.id)}
                        accessibilityLabel={`Edit ${item.name || "expense item"}`}
                      >
                        <Feather
                          name="edit-2"
                          size={15}
                          color={EXPENSE_PRIMARY}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="h-8 w-8 items-center justify-center rounded-full bg-red-50"
                        onPress={() => deleteExpenseItem(item.id)}
                        accessibilityLabel={`Delete ${item.name || "expense item"}`}
                      >
                        <Feather name="trash-2" size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View className="items-center gap-2.5 py-[34px]">
              <Feather name="file-text" size={28} color="#64748B" />
              <Text className="font-inter text-sm text-slate-500">
                No expense items for this day.
              </Text>
            </View>
          )}

          <TouchableOpacity
            className="mt-4 items-center rounded-xl bg-teal-700 py-[13px]"
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Close expense list"
          >
            <Text className="font-inter-semibold text-white">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
