import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View } from "react-native";

import { useDeposits, useExpenses, useMeals, useMess } from "@/redux/hooks";
import { calculateDashboardAccounting } from "@/utils/dashboard";
import {
  formatDashboardAmount,
  formatDashboardQuantity,
  formatDashboardRate,
} from "@/utils/dashboard";

const cardShadow = {
  shadowColor: "#94A3B8",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.16,
  shadowRadius: 8,
  elevation: 3,
};

export const ManagerSummaryCard = () => {
  const { consumers, currentYearMonth, getGrandTotal, getConsumerTotal } =
    useMeals();
  const { getMonthExpenseTotal } = useExpenses();
  const { getGrandDepositTotal, getConsumerDepositTotal } = useDeposits();
  const { currentYearMonth: messYearMonth } = useMess();
  const yearMonth = messYearMonth || currentYearMonth;

  const accounting = calculateDashboardAccounting({
    consumers,
    currentYearMonth: yearMonth,
    appliedRange: null,
    rangeData: {},
    getGrandTotal,
    getMonthExpenseTotal,
    getGrandDepositTotal,
    getConsumerTotal,
    getConsumerDepositTotal,
  });
  const balancePositive = accounting.netBalance >= 0;
  const metrics = [
    {
      label: "Meal Rate",
      value:
        accounting.mealRate > 0
          ? `৳${formatDashboardRate(accounting.mealRate)}`
          : "—",
      icon: "pricetag" as const,
      color: "#7C3AED",
    },
    {
      label: "Total Deposits",
      value: `৳${formatDashboardAmount(accounting.totalDeposits)}`,
      icon: "card" as const,
      color: "#2563EB",
    },
    {
      label: "Total Expenses",
      value: `৳${formatDashboardAmount(accounting.totalExpenses)}`,
      icon: "cash" as const,
      color: "#EA580C",
    },
    {
      label: "Total Meals",
      value: formatDashboardQuantity(accounting.totalMeals),
      icon: "restaurant" as const,
      color: "#059669",
    },
  ];

  return (
    <View
      className="mx-4 mb-4 overflow-hidden rounded-[18px] border border-slate-300 bg-white"
      style={cardShadow}
    >
      <View className="flex-row items-center gap-2 px-4 py-3">
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
          <Feather name="bar-chart-2" size={17} color="#475569" />
        </View>
        <Text className="font-inter-semibold text-sm text-slate-800">
          Mess Monthly Summary
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2 p-2">
        <View className="w-full flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-lg bg-white">
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
            {formatDashboardAmount(Math.abs(accounting.netBalance))}
          </Text>
        </View>
        {metrics.map((metric) => (
          <View
            key={metric.label}
            className="w-[48%] flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2"
          >
            <View className="h-7 w-7 items-center justify-center rounded-lg bg-white">
              <Ionicons name={metric.icon} size={16} color={metric.color} />
            </View>
            <View className="ml-2 min-w-0 flex-1 flex-row items-center justify-between gap-1">
              <Text
                className="min-w-0 flex-1 font-inter text-[10px] text-slate-500"
                numberOfLines={1}
              >
                {metric.label}
              </Text>
              <Text
                className="font-inter-bold text-[13px] text-slate-950"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {metric.value}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
