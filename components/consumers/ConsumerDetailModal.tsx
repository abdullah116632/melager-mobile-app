import Feather from "@expo/vector-icons/Feather";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import { CopyableContactRow } from "@/components/CopyableContactRow";
import type { Consumer } from "@/types/consumer";

interface ConsumerDetailModalProps {
  consumer: Consumer | null;
  onClose: () => void;
}

export const ConsumerDetailModal = ({
  consumer,
  onClose,
}: ConsumerDetailModalProps) => {
  return (
    <Modal
      visible={consumer !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/45">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close consumer details"
        />
        <View className="rounded-t-3xl bg-white px-5 pb-6 pt-3">
          <View className="mb-4 h-1 w-11 self-center rounded-sm bg-slate-200" />

          <View className="mb-2 flex-row items-start gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-teal-100">
              <Feather name="user" size={22} color="#0F766E" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-inter-medium text-[11px] uppercase tracking-[1px] text-teal-700">
                Consumer details
              </Text>
              <Text className="mt-0.5 font-inter-bold text-[18px] leading-6 text-slate-950">
                {consumer?.name}
              </Text>
            </View>
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100"
              onPress={onClose}
              accessibilityLabel="Close consumer details"
            >
              <Feather name="x" size={19} color="#64748B" />
            </TouchableOpacity>
          </View>

          <CopyableContactRow
            icon="mail"
            label="Email"
            value={consumer?.email || "Not available"}
            copyable
          />
          <CopyableContactRow
            icon="phone"
            label="Phone"
            value={consumer?.mobileNumber || "Not available"}
            copyable
          />
          <CopyableContactRow
            icon="shield"
            label="Role"
            value={consumer?.isAdmin ? "Admin" : "Member"}
          />
          <CopyableContactRow
            icon={consumer?.accountDeletedAt ? "user-x" : "user-check"}
            label="Account status"
            value={consumer?.accountDeletedAt ? "Deleted" : "Active"}
          />

          <TouchableOpacity
            className="mt-5 items-center rounded-xl bg-teal-700 py-[13px]"
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text className="font-inter-semibold text-white">Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
