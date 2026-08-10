import Feather from "@expo/vector-icons/Feather";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import type { Consumer } from "@/types/consumer";

type DeleteConsumerModalProps = {
  consumer: Consumer | null;
  onCancel: () => void;
  onConfirm: (consumerId: number) => void;
};

export const DeleteConsumerModal = ({
  consumer,
  onCancel,
  onConfirm,
}: DeleteConsumerModalProps) => (
  <Modal
    visible={consumer !== null}
    transparent
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View className="flex-1 items-center justify-center bg-black/45 p-6">
      <View className="w-full max-w-[360px] items-center gap-3 rounded-[20px] border border-slate-200 bg-white p-6 shadow-2xl shadow-black/15">
        <View className="mb-1 h-[52px] w-[52px] items-center justify-center rounded-2xl bg-red-50">
          <Feather name="trash-2" size={22} color="#DC2626" />
        </View>
        <Text className="text-center font-inter-bold text-lg text-slate-900">
          Delete Consumer?
        </Text>
        <Text className="text-center font-inter text-sm leading-5 text-slate-500">
          All meals, expenses, and deposits for{" "}
          <Text className="font-inter-semibold text-slate-900">
            {consumer?.name}
          </Text>{" "}
          will be permanently deleted.
        </Text>
        <View className="mt-2 w-full flex-row gap-2.5">
          <TouchableOpacity
            className="flex-1 items-center rounded-xl border border-slate-200 bg-slate-100 py-[13px]"
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text className="font-inter-semibold text-[15px] text-slate-900">
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 items-center rounded-xl bg-red-600 py-[13px]"
            onPress={() => {
              if (consumer) onConfirm(consumer.id);
            }}
            activeOpacity={0.7}
          >
            <Text className="font-inter-semibold text-[15px] text-white">
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);
