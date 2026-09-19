import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";
import type { DashboardConsumerRow } from "@/types/dashboard";
import {
  formatDashboardAmount,
  formatDashboardQuantity,
  formatDashboardRate,
} from "@/utils/dashboard";
import {
  SummaryBadge,
  SummaryCardShell,
  SummaryRing,
  SummaryRowList,
} from "./DashboardSummaryParts";

interface DashboardPersonalSummaryProps {
  consumer: DashboardConsumerRow | null;
  mealRate: number;
  isLoading: boolean;
}

const userIcon = <Feather name="user" size={19} color="#0F766E" />;

export const DashboardPersonalSummary = ({
  consumer,
  mealRate,
  isLoading,
}: DashboardPersonalSummaryProps) => {
  // A missing consumer is normal while the month snapshot is still loading.
  // Keep the card structure stable and reserve "unavailable" for a genuinely
  // unlinked account after data has arrived.
  if (!consumer && !isLoading) {
    return (
      <SummaryCardShell
        icon={userIcon}
        title="My Monthly Summary"
        subtitle="Your personal figures for this month"
      >
        <View className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <Text className="font-inter-semibold text-[14px] text-slate-900">
            Summary unavailable
          </Text>
          <Text className="mt-1 font-inter text-[12px] text-slate-500">
            Your account is not linked to a consumer in this mess yet.
          </Text>
        </View>
      </SummaryCardShell>
    );
  }

  const balancePositive = !consumer || consumer.balance >= 0;
  const remainingBalance = consumer
    ? `${balancePositive ? "+" : "-"}৳${formatDashboardAmount(Math.abs(consumer.balance))}`
    : "—";
  const spentFraction =
    consumer && consumer.deposits > 0 ? consumer.cost / consumer.deposits : 0;
  const fullySpent = !balancePositive || spentFraction >= 1;
  const tone = balancePositive ? "emerald" : "rose";

  return (
    <SummaryCardShell
      icon={userIcon}
      title="My Monthly Summary"
      subtitle="Your personal figures for this month"
      badge={
        consumer ? (
          <SummaryBadge
            label={balancePositive ? "Advance" : "Due"}
            tone={tone}
          />
        ) : null
      }
    >
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <SummaryRowList
            rows={[
              {
                label: "My Deposits",
                value: consumer
                  ? `৳${formatDashboardAmount(consumer.deposits)}`
                  : "—",
                labelClassName: "text-teal-700",
                valueClassName: "text-teal-800",
              },
              {
                label: "Meals Taken",
                value: consumer ? formatDashboardQuantity(consumer.meals) : "—",
              },
              {
                label: "Your Cost",
                value: consumer
                  ? `৳${formatDashboardAmount(consumer.cost)}`
                  : "—",
                labelClassName: "text-rose-600",
                valueClassName: "text-rose-700",
              },
              {
                label: "Meal Rate",
                value: mealRate > 0 ? `৳${formatDashboardRate(mealRate)}` : "—",
                labelClassName: "text-teal-700",
              },
            ]}
          />
        </View>
        <SummaryRing
          label="Remaining Balance"
          value={remainingBalance}
          negative={!balancePositive}
          baseColors={
            !consumer
              ? undefined
              : fullySpent
                ? ["#DC2626", "#EF4444"]
                : ["#059669", "#34D399"]
          }
          segments={
            consumer && !fullySpent
              ? [{ fraction: spentFraction, colors: ["#F59E0B", "#FBBF24"] }]
              : []
          }
        />
      </View>
    </SummaryCardShell>
  );
};
