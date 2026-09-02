import Feather from "@expo/vector-icons/Feather";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { CopyableContactRow } from "@/components/CopyableContactRow";
import type { DashboardConsumerRow } from "@/types/dashboard";
import {
  formatDashboardAmount,
  formatDashboardQuantity,
} from "@/utils/dashboard";

interface DashboardConsumerDetailModalProps {
  consumer: DashboardConsumerRow | null;
  onClose: () => void;
}

const AmountCard = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) => (
  <View className="min-w-[46%] flex-1 rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
    <Text className="font-inter-medium text-[11px] text-slate-500">
      {label}
    </Text>
    <Text
      className={`mt-1 font-inter-bold text-[15px] ${
        tone === "positive"
          ? "text-emerald-600"
          : tone === "negative"
            ? "text-red-600"
            : "text-slate-900"
      }`}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
    >
      {value}
    </Text>
  </View>
);

export const DashboardConsumerDetailModal = ({
  consumer,
  onClose,
}: DashboardConsumerDetailModalProps) => {
  const balance = consumer?.balance ?? 0;
  const balancePrefix = balance > 0.005 ? "+" : balance < -0.005 ? "-" : "";

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
        <View className="max-h-[82%] rounded-t-3xl bg-white px-5 pb-6 pt-3">
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

          <ScrollView showsVerticalScrollIndicator={false}>
            <CopyableContactRow
              icon="mail"
              label="Email"
              value={consumer?.email || "Not available"}
              copyable
            />
            <CopyableContactRow
              icon="phone"
              label="Mobile number"
              value={consumer?.mobileNumber || "Not available"}
              copyable
            />
            <CopyableContactRow
              icon="shield"
              label="Role"
              value={consumer?.isAdmin ? "Admin" : "Member"}
            />
            <Text className="mb-2 mt-5 font-inter-bold text-[13px] text-slate-900">
              Accounting summary
            </Text>
            <View className="flex-row flex-wrap gap-2.5">
              <AmountCard
                label="Meals"
                value={formatDashboardQuantity(consumer?.meals ?? 0)}
              />
              <AmountCard
                label="Cost"
                value={`\u09F3${formatDashboardAmount(consumer?.cost ?? 0)}`}
              />
              <AmountCard
                label="Deposit"
                value={`\u09F3${formatDashboardAmount(consumer?.deposits ?? 0)}`}
              />
              <AmountCard
                label="Balance"
                value={`${balancePrefix}\u09F3${formatDashboardAmount(Math.abs(balance))}`}
                tone={
                  balance > 0.005
                    ? "positive"
                    : balance < -0.005
                      ? "negative"
                      : "default"
                }
              />
            </View>
          </ScrollView>

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
