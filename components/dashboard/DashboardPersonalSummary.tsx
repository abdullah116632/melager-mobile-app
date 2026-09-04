import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";
import type { DashboardConsumerRow } from "@/types/dashboard";
import {
  formatDashboardAmount,
  formatDashboardQuantity,
} from "@/utils/dashboard";

const cardShadow = {
  shadowColor: "#94A3B8",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 3,
};

interface DashboardPersonalSummaryProps {
  consumer: DashboardConsumerRow | null;
  isLoading: boolean;
}

export const DashboardPersonalSummary = ({
  consumer,
  isLoading,
}: DashboardPersonalSummaryProps) => {
  // A missing consumer is normal while the month snapshot is still loading.
  // Keep the card structure stable and reserve "unavailable" for a genuinely
  // unlinked account after data has arrived.
  if (!consumer && !isLoading) {
    return (
      <View
        className="mx-4 mb-4 overflow-hidden rounded-[18px] border border-[#B7D9BE] bg-[#E8F5E9]"
        style={cardShadow}
      >
        <View className="flex-row items-center gap-2 px-4 py-3">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Feather name="user" size={17} color="#475569" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-inter-semibold text-sm text-slate-800">
              My Monthly Summary
            </Text>
            <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
              Your personal figures for this month
            </Text>
          </View>
        </View>
        <View className="px-4 pb-4">
          <Text className="font-inter-semibold text-[14px] text-slate-900">
            Summary unavailable
          </Text>
          <Text className="mt-1 font-inter text-[12px] text-slate-500">
            Your account is not linked to a consumer in this mess yet.
          </Text>
        </View>
      </View>
    );
  }

  const balancePositive = !consumer || consumer.balance >= 0;
  const remainingBalance = consumer
    ? `${balancePositive ? "+" : "-"}৳${formatDashboardAmount(Math.abs(consumer.balance))}`
    : "—";
  const items = [
    {
      label: "Meals You Takes",
      value: consumer ? formatDashboardQuantity(consumer.meals) : "—",
      icon: "restaurant" as const,
      color: "#059669",
    },
    {
      label: "Your Total Deposits",
      value: consumer ? `৳${formatDashboardAmount(consumer.deposits)}` : "—",
      icon: "card" as const,
      color: "#2563EB",
    },
    {
      label: "Your Total Cost",
      value: consumer ? `৳${formatDashboardAmount(consumer.cost)}` : "—",
      icon: "cash" as const,
      color: "#EA580C",
    },
    {
      label: "Remaining Balance",
      value: remainingBalance,
      icon: "card" as const,
      color: balancePositive ? "#0F766E" : "#DC2626",
    },
  ];

  return (
    <>
      <View
        className="mx-4 mb-4 overflow-hidden rounded-[18px] border border-[#B7D9BE] bg-[#E8F5E9]"
        style={cardShadow}
      >
        <View className="flex-row items-center gap-2 px-4 py-3">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Feather name="user" size={17} color="#475569" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-inter-semibold text-sm text-slate-800">
              My Monthly Summary
            </Text>
            <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
              Your personal figures for this month
            </Text>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2 p-2">
          {items.map((item) => (
            <View
              key={item.label}
              className="w-full flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
            >
              <View className="h-7 w-7 items-center justify-center rounded-lg bg-white">
                <Ionicons name={item.icon} size={16} color={item.color} />
              </View>
              <View className="ml-2 min-w-0 flex-1 flex-row items-center justify-between gap-1">
                <Text
                  className="min-w-0 flex-1 font-inter text-[10px] text-slate-500"
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text
                  className={`font-inter-bold text-[13px] ${item.label === "Remaining Balance" ? (balancePositive ? "text-teal-800" : "text-red-700") : "text-slate-950"}`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </>
  );
};
