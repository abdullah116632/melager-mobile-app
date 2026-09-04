import Ionicons from "@expo/vector-icons/Ionicons";
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
      <>
        <View className="mx-4 mb-3">
          <Text className="font-inter-bold text-[17px] text-slate-900">
            My monthly summary
          </Text>
        </View>
        <View
          className="mx-4 mb-4 rounded-[18px] border border-slate-200 bg-white px-4 py-4"
          style={cardShadow}
        >
          <Text className="font-inter-semibold text-[14px] text-slate-900">
            Summary unavailable
          </Text>
          <Text className="mt-1 font-inter text-[12px] text-slate-500">
            Your account is not linked to a consumer in this mess yet.
          </Text>
        </View>
      </>
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
        className="mx-4 mb-4 overflow-hidden rounded-[18px] border border-slate-300 bg-white"
        style={cardShadow}
      >
        <View className="flex-row items-center border-b border-teal-100 bg-teal-50 px-4 py-3">
          <View
            className={`h-9 w-9 items-center justify-center rounded-full ${balancePositive ? "bg-teal-200" : "bg-red-200"}`}
          >
            <Ionicons
              name="card"
              size={17}
              color={balancePositive ? "#0F766E" : "#DC2626"}
            />
          </View>
          <View className="ml-2.5 min-w-0 flex-1">
            <Text className="font-inter-bold text-[15px] text-slate-900">
              My monthly summary
            </Text>
            <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
              Your personal figures for this month
            </Text>
          </View>
        </View>
        <View className="flex-row flex-wrap border-t border-slate-200 p-2">
          {items.map((item, index) => (
            <View key={item.label} className={`w-full px-2.5 ${index < items.length - 1 ? "border-b border-slate-200" : ""}`}>
              <View className="flex-row items-center px-2.5 py-3">
                <View
                  className="h-8 w-8 items-center justify-center"
                >
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <View className="ml-2 min-w-0 flex-1">
                  <Text
                    className="font-inter text-[11px] text-slate-500"
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
                <Text
                  className={`ml-3 font-inter-bold text-[16px] ${item.label === "Remaining Balance" ? (balancePositive ? "text-teal-800" : "text-red-700") : "text-slate-950"}`}
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
