import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { DepositEntry } from "@/types/deposit";
import {
  formatDepositAmount,
  formatDepositTimestamp,
  getDepositTotal,
} from "@/utils/deposit";

interface DepositHistoryModalProps {
  visible: boolean;
  consumerName: string;
  entries: DepositEntry[];
  isAdmin: boolean;
  deletingId: number | null;
  onEdit: (entry: DepositEntry) => void;
  onDelete: (entryId: number) => void;
  onClose: () => void;
}

export const DepositHistoryModal = ({
  visible,
  consumerName,
  entries,
  isAdmin,
  deletingId,
  onEdit,
  onDelete,
  onClose,
}: DepositHistoryModalProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <KeyboardAvoidingView
      className="flex-1 justify-end bg-black/40"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableOpacity
        className="absolute inset-0"
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="flex-1" />
      </TouchableOpacity>
      <View className="max-h-[75%] rounded-t-3xl bg-white p-5 pb-9 shadow-2xl shadow-black/10">
        <View className="mb-4 h-1 w-11 self-center rounded-sm bg-slate-200" />
        <View className="mb-1 flex-row items-center gap-3">
          <Text
            className="flex-1 font-inter-bold text-lg text-slate-900"
            numberOfLines={1}
          >
            Deposits — {consumerName}
          </Text>
          <Text className="font-inter-bold text-lg text-teal-700">
            ৳{formatDepositAmount(getDepositTotal(entries))}
          </Text>
          <TouchableOpacity
            className="h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-slate-100"
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close deposit history"
          >
            <Feather name="x" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {entries.length === 0 ? (
          <Text className="mt-4 px-8 text-center font-inter text-sm text-slate-500">
            No deposits this month.
          </Text>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id.toString()}
            className="mt-3"
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View className="flex-row items-center gap-2.5 border-b border-slate-200 py-2.5">
                <View className="w-5 items-center">
                  <View className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-inter-semibold text-[15px] ${item.amount < 0 ? "text-red-600" : "text-teal-700"}`}
                  >
                    ৳{formatDepositAmount(item.amount)}
                  </Text>
                  <Text className="mt-0.5 font-inter text-xs text-slate-500">
                    {formatDepositTimestamp(item.depositedAt)}
                  </Text>
                  {item.note ? (
                    <Text className="mt-0.5 font-inter text-xs italic text-slate-500">
                      {item.note}
                    </Text>
                  ) : null}
                </View>
                {isAdmin && (
                  <View className="flex-row items-center gap-4">
                    <TouchableOpacity
                      onPress={() => onEdit(item)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Edit deposit"
                    >
                      <Feather name="edit-2" size={16} color="#0F766E" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => onDelete(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <Feather name="trash-2" size={16} color="#DC2626" />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        )}

        <TouchableOpacity
          className="mt-4 items-center rounded-xl bg-teal-700 py-[13px]"
          onPress={onClose}
        >
          <Text className="font-inter-semibold text-white">Close</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);
