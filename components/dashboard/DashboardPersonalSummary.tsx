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
}

export const DashboardPersonalSummary = ({
  consumer,
}: DashboardPersonalSummaryProps) => {
  if (!consumer) {
    return (
      <>
        <View className="mx-4 mb-3">
          <Text className="font-inter-bold text-[17px] text-slate-900">
            Your Summary
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

  const balancePositive = consumer.balance >= 0;
  const remainingBalance = `${balancePositive ? "+" : "-"}৳${formatDashboardAmount(Math.abs(consumer.balance))}`;
  const items = [
    {
      label: "Meals You Takes",
      value: formatDashboardQuantity(consumer.meals),
      icon: "restaurant" as const,
      tone: "bg-emerald-50",
      color: "#059669",
    },
    {
      label: "Your Total Deposits",
      value: `৳${formatDashboardAmount(consumer.deposits)}`,
      icon: "card" as const,
      tone: "bg-blue-50",
      color: "#2563EB",
    },
    {
      label: "Your Total Cost",
      value: `৳${formatDashboardAmount(consumer.cost)}`,
      icon: "cash" as const,
      tone: "bg-orange-50",
      color: "#EA580C",
    },
    {
      label: "Remaining Balance",
      value: remainingBalance,
      icon: "card" as const,
      tone: balancePositive ? "bg-teal-50" : "bg-red-50",
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
              Your Summary
            </Text>
            <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
              Your personal figures for this month
            </Text>
          </View>
        </View>
        <View className="flex-row flex-wrap border-t border-slate-200 p-2">
          {items.map((item) => (
            <View key={item.label} className="w-full p-1.5">
              <View className="flex-row items-center rounded-[14px] bg-slate-100 px-2.5 py-3">
                <View
                  className={`h-8 w-8 items-center justify-center rounded-[10px] ${item.tone}`}
                >
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <View className="ml-2 min-w-0 flex-1">
                  <Text
                    className="font-inter text-[10px] text-slate-500"
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
                <Text
                  className="ml-3 font-inter-bold text-[15px] text-slate-950"
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
