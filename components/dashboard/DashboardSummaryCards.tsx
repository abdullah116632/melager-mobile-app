import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { DashboardAccounting } from "@/types/dashboard";
import {
  formatDashboardAmount,
  formatDashboardQuantity,
  formatDashboardRate,
} from "@/utils/dashboard";

const cardShadow = {
  shadowColor: "#94A3B8",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 3,
};

interface DashboardSummaryCardsProps {
  accounting: DashboardAccounting;
}

export const DashboardSummaryCards = ({
  accounting,
}: DashboardSummaryCardsProps) => {
  const [expanded, setExpanded] = useState(false);
  const { totalMeals, totalExpenses, totalDeposits, mealRate, netBalance } =
    accounting;
  const balancePositive = netBalance >= 0;
  const mealRateValue =
    mealRate > 0 ? `৳${formatDashboardRate(mealRate)}` : "—";
  const items = [
    {
      label: "Total Meals",
      value: formatDashboardQuantity(totalMeals),
      icon: "restaurant" as const,
      tone: "bg-emerald-50",
      color: "#059669",
    },
    {
      label: "Total Expenses",
      value: `৳${formatDashboardAmount(totalExpenses)}`,
      icon: "cash" as const,
      tone: "bg-orange-50",
      color: "#EA580C",
    },
    {
      label: "Total Deposits",
      value: `৳${formatDashboardAmount(totalDeposits)}`,
      icon: "card" as const,
      tone: "bg-blue-50",
      color: "#2563EB",
    },
    {
      label: "Meal Rate",
      value: mealRateValue,
      icon: "pricetag" as const,
      tone: "bg-violet-50",
      color: "#7C3AED",
      sub: mealRate > 0 ? "per meal" : "no meals yet",
    },
  ];

  return (
    <>
      <View className="mx-4 mb-3">
        <Text className="font-inter-bold text-[17px] text-slate-900">
          Mess Summary
        </Text>
        <Text className="mt-0.5 font-inter text-[12px] text-slate-500">
          Overall figures for this month
        </Text>
      </View>
      <View
        className="mx-4 mb-5 overflow-hidden rounded-[18px] border border-slate-200 bg-white"
        style={cardShadow}
      >
        <TouchableOpacity
          className="flex-row items-center bg-slate-50 px-4 py-3"
          onPress={() => setExpanded((current) => !current)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Toggle mess summary"
          accessibilityState={{ expanded }}
        >
          <View className="h-9 w-9 items-center justify-center rounded-full bg-violet-100">
            <Ionicons name="pricetag" size={17} color="#7C3AED" />
          </View>
          <View className="ml-2.5 min-w-0 flex-1">
            <Text className="font-inter-bold text-[15px] text-slate-900">
              Meal Rate
            </Text>
            <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
              {mealRate > 0 ? "Per meal" : "No meals yet"}
            </Text>
          </View>
          <Text
            className="ml-2 font-inter-bold text-[16px] text-violet-700"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {mealRateValue}
          </Text>
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748B"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>

        {expanded ? (
          <View className="border-t border-slate-100 p-2">
            <View
              className={`mb-1.5 flex-row items-center rounded-[14px] px-3 py-3 ${balancePositive ? "bg-teal-50" : "bg-red-50"}`}
            >
              <View
                className={`h-9 w-9 items-center justify-center rounded-[11px] ${balancePositive ? "bg-teal-100" : "bg-red-100"}`}
              >
                <Feather
                  name="credit-card"
                  size={17}
                  color={balancePositive ? "#0F766E" : "#DC2626"}
                />
              </View>
              <View className="ml-2.5 flex-1">
                <Text className="font-inter text-[11px] text-slate-600">
                  Current Balance
                </Text>
                <Text className="mt-0.5 font-inter text-[10px] text-slate-500">
                  Deposits minus expenses
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

            <View className="flex-row flex-wrap">
              {items.map((item) => (
                <View key={item.label} className="w-full p-1.5">
                  <View className="flex-row items-center rounded-[14px] bg-slate-50 px-2.5 py-3">
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
                      {item.sub ? (
                        <Text className="mt-0.5 font-inter text-[9px] text-slate-500">
                          {item.sub}
                        </Text>
                      ) : null}
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
        ) : null}
      </View>
    </>
  );
};
