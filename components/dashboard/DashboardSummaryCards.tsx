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
  SummaryPill,
  SummaryRing,
  SummaryTile,
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
          pill={
            balancePositive ? (
              <SummaryPill label="Active Balance" tone="emerald" />
            ) : null
          }
        />

        <View className="mt-3 gap-2.5 border-t border-slate-200/70 pt-4">
          <View className="flex-row gap-2.5">
            <SummaryTile
              label="Total Deposits"
              labelClassName="text-teal-700"
              valueClassName="text-teal-800"
              borderClassName="border-emerald-200"
              bgClassName="bg-emerald-50"
              value={`৳${formatDashboardAmount(totalDeposits)}`}
            />
            <SummaryTile
              label="Total Expenses"
              labelClassName="text-rose-600"
              valueClassName="text-rose-700"
              borderClassName="border-rose-200"
              bgClassName="bg-rose-50"
              value={`৳${formatDashboardAmount(totalExpenses)}`}
            />
          </View>
          <View className="flex-row gap-2.5">
            <SummaryTile
              label="Total Meals"
              value={formatDashboardQuantity(totalMeals)}
            />
            <SummaryTile
              label="Meal Rate"
              labelClassName="text-teal-700"
              value={mealRateValue}
            />
          </View>
        </View>
      </SummaryCardShell>
    </View>
  );
};
