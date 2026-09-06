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
      label: "Meals Taken",
      value: consumer ? formatDashboardQuantity(consumer.meals) : "—",
      icon: "restaurant" as const,
      color: "#059669",
    },
    {
      label: "Your Deposits",
      value: consumer ? `৳${formatDashboardAmount(consumer.deposits)}` : "—",
      icon: "card" as const,
      color: "#2563EB",
    },
    {
      label: "Your Cost",
      value: consumer ? `৳${formatDashboardAmount(consumer.cost)}` : "—",
      icon: "cash" as const,
      color: "#EA580C",
    },
  ];

  return (
    <View
      className="mx-4 mb-4 overflow-hidden rounded-[18px] border border-[#B7D9BE] bg-[#E8F5E9]"
      style={cardShadow}
    >
      <View className="flex-row items-center gap-2 px-4 py-3">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
          <Feather name="user" size={16} color="#16A34A" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-inter-semibold text-base text-slate-800">
            My Monthly Summary
          </Text>
          <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
            Your personal figures for this month
          </Text>
        </View>
      </View>

      <View className="gap-2 p-2">
        {items.map((item) => (
          <View
            key={item.label}
            className="w-full flex-row items-center justify-between rounded-xl border border-[#B7D9BE] bg-white p-3"
          >
            <View className="flex-row items-center gap-2">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${item.color}1A` }}
              >
                <Ionicons name={item.icon} size={17} color={item.color} />
              </View>
              <Text className="font-inter-semibold text-sm text-slate-700">
                {item.label}
              </Text>
            </View>
            <Text
              className="ml-3 font-inter-bold text-[14px] text-slate-900"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {item.value}
            </Text>
          </View>
        ))}

        <View
          className={`w-full flex-row items-center justify-between rounded-xl border p-3.5 ${
            balancePositive
              ? "border-teal-200 bg-teal-50"
              : "border-orange-200 bg-orange-50"
          }`}
        >
          <View className="flex-row items-center gap-2.5">
            <View
              className={`h-9 w-9 items-center justify-center rounded-full ${
                balancePositive ? "bg-teal-100" : "bg-orange-100"
              }`}
            >
              <Feather
                name="credit-card"
                size={17}
                color={balancePositive ? "#0F766E" : "#C2410C"}
              />
            </View>
            <Text
              className={`font-inter-semibold text-sm ${
                balancePositive ? "text-teal-800" : "text-orange-800"
              }`}
            >
              Remaining Balance
            </Text>
          </View>
          <Text
            className={`ml-3 font-inter-bold text-[16px] ${
              balancePositive ? "text-teal-800" : "text-orange-800"
            }`}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {remainingBalance}
          </Text>
        </View>
      </View>
    </View>
  );
};
