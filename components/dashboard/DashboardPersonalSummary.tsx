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
  SummaryTile,
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
      <SummaryRing
        label="Remaining Balance"
        value={remainingBalance}
        negative={!balancePositive}
        segments={
          !consumer
            ? []
            : balancePositive
              ? [{ fraction: spentFraction, colors: ["#059669", "#34D399"] }]
              : [{ fraction: 1, colors: ["#F43F5E", "#FB7185"] }]
        }
      />

      <View className="mt-3 gap-2.5 border-t border-slate-200/70 pt-4">
        <View className="flex-row gap-2.5">
          <SummaryTile
            centered
            label="Your Deposits"
            labelClassName="text-teal-700"
            valueClassName="text-teal-800"
            borderClassName="border-emerald-200"
            bgClassName="bg-emerald-50"
            value={
              consumer ? `৳${formatDashboardAmount(consumer.deposits)}` : "—"
            }
          />
          <SummaryTile
            centered
            label="Meals Taken"
            value={consumer ? formatDashboardQuantity(consumer.meals) : "—"}
          />
        </View>
        <View className="flex-row gap-2.5">
          <SummaryTile
            centered
            label="Your Cost"
            labelClassName="text-rose-600"
            valueClassName="text-rose-700"
            borderClassName="border-rose-200"
            bgClassName="bg-rose-50"
            value={consumer ? `৳${formatDashboardAmount(consumer.cost)}` : "—"}
          />
          <SummaryTile
            centered
            label="Meal Rate"
            labelClassName="text-teal-700"
            value={mealRate > 0 ? `৳${formatDashboardRate(mealRate)}` : "—"}
          />
        </View>
      </View>
    </SummaryCardShell>
  );
};
