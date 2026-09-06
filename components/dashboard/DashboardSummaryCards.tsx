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
    <View
      className="mx-4 mb-5 overflow-hidden rounded-[18px] border border-violet-200 bg-violet-50"
      style={cardShadow}
    >
      <View className="flex-row items-center gap-2 px-4 py-3">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
          <Feather name="bar-chart-2" size={16} color="#7C3AED" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-inter-semibold text-base text-slate-800">
            Mess Monthly Summary
          </Text>
          <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
            Overall figures for this month
          </Text>
        </View>
      </View>

      <View className="gap-2 p-2">
        {items.map((item) => (
          <View
            key={item.label}
            className="w-full flex-row items-center justify-between rounded-xl border border-violet-100 bg-white p-3"
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
              Current Balance
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
            {balancePositive ? "+" : "-"}৳
            {formatDashboardAmount(Math.abs(netBalance))}
          </Text>
        </View>
      </View>
    </View>
  );
};
