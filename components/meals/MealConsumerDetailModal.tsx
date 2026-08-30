import Feather from "@expo/vector-icons/Feather";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import type { Consumer } from "@/types/mess";
import { formatMealValue } from "@/utils/meal";

interface MealConsumerDetailModalProps {
  consumer: Consumer | null;
  monthLabel: string;
  totalMeals: number;
  onClose: () => void;
}

const DetailRow = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) => (
  <View className="flex-row items-center gap-3 border-b-[0.5px] border-slate-200 py-3">
    <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-teal-50">
      <Feather name={icon} size={17} color="#0F766E" />
    </View>
    <View className="min-w-0 flex-1">
      <Text className="font-inter-medium text-[11px] text-slate-500">
        {label}
      </Text>
      <Text
        className="mt-0.5 font-inter-semibold text-[14px] text-slate-900"
        selectable
      >
        {value}
      </Text>
    </View>
  </View>
);

export const MealConsumerDetailModal = ({
  consumer,
  monthLabel,
  totalMeals,
  onClose,
}: MealConsumerDetailModalProps) => (
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
        accessibilityLabel="Close meal consumer details"
      />
      <View className="rounded-t-3xl bg-white px-5 pb-6 pt-3">
        <View className="mb-4 h-1 w-11 self-center rounded-sm bg-slate-200" />

        <View className="mb-2 flex-row items-start gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-teal-100">
            <Feather name="user" size={22} color="#0F766E" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-inter-medium text-[11px] uppercase tracking-[1px] text-teal-700">
              Monthly meal details
            </Text>
            <Text className="mt-0.5 font-inter-bold text-[18px] leading-6 text-slate-950">
              {consumer?.name}
            </Text>
          </View>
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100"
            onPress={onClose}
            accessibilityLabel="Close meal consumer details"
          >
            <Feather name="x" size={19} color="#64748B" />
          </TouchableOpacity>
        </View>

        <DetailRow
          icon="mail"
          label="Email"
          value={consumer?.email || "Not available"}
        />
        <DetailRow
          icon="phone"
          label="Phone"
          value={consumer?.mobileNumber || "Not available"}
        />
        <DetailRow
          icon="shield"
          label="Role"
          value={consumer?.isAdmin ? "Admin" : "Member"}
        />

        <View className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="font-inter-medium text-[11px] text-teal-700">
                Total consumed meals
              </Text>
              <Text className="mt-0.5 font-inter-semibold text-[12px] text-slate-500">
                {monthLabel}
              </Text>
            </View>
            <Text className="font-inter-bold text-[24px] text-teal-700">
              {formatMealValue(totalMeals)}
            </Text>
          </View>
        </View>

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
