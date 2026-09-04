import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";
import type { DashboardAccounting } from "@/types/dashboard";
import {
  formatDashboardAmount,
  formatDashboardQuantity,
  formatDashboardRate,
} from "@/utils/dashboard";

const cardShadow = {
  shadowColor: "#94A3B8",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 3,
};

interface DashboardSummaryCardsProps {
  accounting: DashboardAccounting;
}

export const DashboardSummaryCards = ({
  accounting,
}: DashboardSummaryCardsProps) => {
  const { totalMeals, totalExpenses, totalDeposits, mealRate, netBalance } =
    accounting;
  const balancePositive = netBalance >= 0;
  const mealRateValue =
    mealRate > 0 ? `৳${formatDashboardRate(mealRate)}` : "—";
  const items = [
    {
      label: "Meal Rate",
      value: mealRateValue,
      icon: "pricetag" as const,
      color: "#7C3AED",
      sub: mealRate > 0 ? "per meal" : "no meals yet",
    },
    {
      label: "Total Meals",
      value: formatDashboardQuantity(totalMeals),
      icon: "restaurant" as const,
      color: "#059669",
    },
    {
      label: "Total Deposits",
      value: `৳${formatDashboardAmount(totalDeposits)}`,
      icon: "card" as const,
      color: "#2563EB",
    },
    {
      label: "Total Expenses",
      value: `৳${formatDashboardAmount(totalExpenses)}`,
      icon: "cash" as const,
      color: "#EA580C",
    },
  ];

  return (
    <>
      <View
        className="mx-4 mb-5 overflow-hidden rounded-[18px] border border-violet-200 bg-violet-50"
        style={cardShadow}
      >
        <View className="flex-row items-center gap-2 px-4 py-3">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
            <Feather name="bar-chart-2" size={17} color="#7C3AED" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-inter-semibold text-sm text-slate-800">
              Mess Monthly Summary
            </Text>
            <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
              Overall figures for this month
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-2 p-2">
          <View className="w-full flex-row items-center justify-between rounded-xl border border-violet-200 bg-white p-3">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
                <Feather
                  name="credit-card"
                  size={16}
                  color={balancePositive ? "#0F766E" : "#DC2626"}
                />
              </View>
              <Text className="font-inter-semibold text-sm text-slate-700">
                Current Balance
              </Text>
            </View>
            <Text
              className={`ml-3 font-inter-bold text-[17px] ${balancePositive ? "text-teal-800" : "text-red-700"}`}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {balancePositive ? "+" : "-"}৳
              {formatDashboardAmount(Math.abs(netBalance))}
            </Text>
          </View>
          {items.map((item) => (
            <View
              key={item.label}
              className="w-full flex-row items-center rounded-xl border border-violet-100 bg-white px-2.5 py-2"
            >
              <View className="h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
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
                  className="font-inter-bold text-[13px] text-slate-950"
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
