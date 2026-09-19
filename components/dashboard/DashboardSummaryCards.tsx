import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";
import type { DashboardAccounting } from "@/types/dashboard";
import {
  formatDashboardAmount,
  formatDashboardQuantity,
  formatDashboardRate,
} from "@/utils/dashboard";
import {
  SummaryCardShell,
  SummaryRing,
  SummaryRowList,
} from "./DashboardSummaryParts";

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
  const spentFraction = totalDeposits > 0 ? totalExpenses / totalDeposits : 0;
  const fullySpent = !balancePositive || spentFraction >= 1;

  return (
    <View className="mb-1">
      <SummaryCardShell
        icon={<Feather name="bar-chart-2" size={19} color="#0F766E" />}
        title="Mess Monthly Summary"
        subtitle="Overall figures for this month"
      >
        <View className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1">
            <SummaryRowList
              rows={[
                {
                  label: "Total Deposits",
                  value: `৳${formatDashboardAmount(totalDeposits)}`,
                  labelClassName: "text-teal-700",
                  valueClassName: "text-teal-800",
                },
                {
                  label: "Total Meals",
                  value: formatDashboardQuantity(totalMeals),
                },
                {
                  label: "Total Expenses",
                  value: `৳${formatDashboardAmount(totalExpenses)}`,
                  labelClassName: "text-rose-600",
                  valueClassName: "text-rose-700",
                },
                {
                  label: "Meal Rate",
                  value: mealRateValue,
                  labelClassName: "text-teal-700",
                },
              ]}
            />
          </View>
          <SummaryRing
            label="Current Balance"
            value={`${balancePositive ? "+" : "-"}৳${formatDashboardAmount(Math.abs(netBalance))}`}
            negative={!balancePositive}
            baseColors={
              fullySpent ? ["#DC2626", "#EF4444"] : ["#059669", "#34D399"]
            }
            segments={
              fullySpent
                ? []
                : [{ fraction: spentFraction, colors: ["#F59E0B", "#FBBF24"] }]
            }
          />
        </View>
      </SummaryCardShell>
    </View>
  );
};
