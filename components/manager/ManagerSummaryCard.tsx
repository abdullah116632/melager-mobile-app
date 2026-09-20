import Feather from "@expo/vector-icons/Feather";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  SummaryCardShell,
  SummaryRing,
  SummaryRowList,
} from "@/components/dashboard/DashboardSummaryParts";
import { useDashboardLocalAccounting } from "@/hooks/useDashboardLocalAccounting";
import { useDeposits, useExpenses, useMeals, useMess } from "@/redux/hooks";
import {
  formatDashboardAmount,
  formatDashboardQuantity,
  formatDashboardRate,
} from "@/utils/dashboard";
import {
  buildManagerTrends,
  type ManagerTrendMetric,
} from "@/utils/managerStats";

import { ManagerTrendChart, type TrendChartVariant } from "./ManagerTrendChart";

const chartIcon = <Feather name="trending-up" size={19} color="#0F766E" />;

const formatTaka = (value: number) => `৳${formatDashboardAmount(value)}`;

interface TabConfig {
  metric: ManagerTrendMetric;
  tab: string;
  title: string;
  caption: string;
  variant: TrendChartVariant;
  color: string;
  format: (value: number) => string;
}

const TABS: TabConfig[] = [
  {
    metric: "rate",
    tab: "Meal Rate",
    title: "Meal Rate Trend",
    caption: "Rate charged up to each day",
    variant: "line",
    color: "#7C3AED",
    format: (value) => `৳${formatDashboardRate(value)}`,
  },
  {
    metric: "deposits",
    tab: "Deposit",
    title: "Daily Deposit Trend",
    caption: "Collected on each day",
    variant: "bar",
    color: "#0F766E",
    format: formatTaka,
  },
  {
    metric: "expenses",
    tab: "Expense",
    title: "Daily Expense Trend",
    caption: "Spent on each day",
    variant: "bar",
    color: "#BE123C",
    format: formatTaka,
  },
  {
    metric: "meals",
    tab: "Meals",
    title: "Daily Meals Trend",
    caption: "Meals taken on each day",
    variant: "bar",
    color: "#D97706",
    format: formatDashboardQuantity,
  },
];

export const ManagerSummaryCard = () => {
  const { meals } = useMeals();
  const { expenses } = useExpenses();
  const { deposits } = useDeposits();
  const { currentYearMonth: yearMonth, getDaysInMonth } = useMess();
  const [activeMetric, setActiveMetric] = useState<ManagerTrendMetric>("rate");

  // The same figures the dues card below this one is built from, so the two
  // always agree.
  const accounting = useDashboardLocalAccounting();

  const trends = useMemo(
    () =>
      buildManagerTrends({
        yearMonth,
        daysInMonth: getDaysInMonth(yearMonth),
        meals: meals[yearMonth],
        expenses: expenses[yearMonth],
        deposits: deposits[yearMonth],
      }),
    [yearMonth, getDaysInMonth, meals, expenses, deposits],
  );

  const balancePositive = accounting.netBalance >= 0;
  const spentFraction =
    accounting.totalDeposits > 0
      ? accounting.totalExpenses / accounting.totalDeposits
      : 0;
  const fullySpent = !balancePositive || spentFraction >= 1;

  const active = TABS.find((tab) => tab.metric === activeMetric) ?? TABS[0]!;
  const series = trends[activeMetric];
  // An all-zero month draws a flat line along the floor that says nothing.
  const hasTrend = series.points.length >= 2 && series.max > 0;
  const rising = series.change > 0;

  // A climbing meal rate is the one movement here that is bad news, so that
  // line turns red. The daily bars carry no such meaning and keep one colour.
  const seriesColor =
    activeMetric === "rate" && rising ? "#DC2626" : active.color;

  // Only the rate is a single running figure worth naming. A daily bar chart's
  // "current" would be whatever today happens to hold, which the bars already
  // show and which reads as a drop on any day nothing was recorded.
  const showHeadline = activeMetric === "rate" && hasTrend;

  return (
    <SummaryCardShell
      icon={chartIcon}
      title="Mess Monthly Summary"
      subtitle="How the meal rate moved this month"
    >
      <View className="flex-row items-center gap-3">
        <View className="min-w-0 flex-1">
          <SummaryRowList
            rows={[
              {
                label: "Meal Rate",
                value:
                  accounting.mealRate > 0
                    ? `৳${formatDashboardRate(accounting.mealRate)}`
                    : "—",
                labelClassName: "text-teal-700",
                valueClassName: "text-teal-800",
              },
              {
                label: "Total Deposits",
                value: formatTaka(accounting.totalDeposits),
              },
              {
                label: "Total Expenses",
                value: formatTaka(accounting.totalExpenses),
                labelClassName: "text-rose-600",
                valueClassName: "text-rose-700",
              },
              {
                label: "Total Meals",
                value: formatDashboardQuantity(accounting.totalMeals),
              },
            ]}
          />
        </View>
        <SummaryRing
          label="Current Balance"
          value={`${balancePositive ? "+" : "-"}${formatTaka(Math.abs(accounting.netBalance))}`}
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

      <View className="mt-3 rounded-2xl border border-slate-300 bg-white px-3 pb-3 pt-2.5 shadow-sm shadow-slate-400/30">
        <View className="mb-2 flex-row items-end justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="font-inter-semibold text-[11.5px] text-slate-600">
              {active.title}
            </Text>
            <Text
              className="font-inter text-[10px] text-slate-400"
              numberOfLines={1}
            >
              {active.caption}
            </Text>
          </View>
          {showHeadline ? (
            <View className="flex-row items-center gap-1">
              <Feather
                name={
                  series.change === 0
                    ? "minus"
                    : rising
                      ? "arrow-up-right"
                      : "arrow-down-right"
                }
                size={13}
                color={series.change === 0 ? "#94A3B8" : seriesColor}
              />
              <Text
                className="font-inter-bold text-[15px] text-slate-900"
                style={{ fontVariant: ["tabular-nums"] }}
                numberOfLines={1}
              >
                {active.format(series.current)}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mb-2.5 flex-row rounded-xl bg-slate-100 p-0.5">
          {TABS.map((tab) => {
            const selected = tab.metric === activeMetric;
            return (
              <Pressable
                key={tab.metric}
                className={`flex-1 items-center rounded-[9px] py-1.5 ${selected ? "bg-white" : ""}`}
                onPress={() => setActiveMetric(tab.metric)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={tab.title}
              >
                <Text
                  className="font-inter-semibold text-[11px]"
                  style={{ color: selected ? tab.color : "#64748B" }}
                  numberOfLines={1}
                  // "Meal Rate" is the widest label and shares an equal quarter
                  // of the strip with the short ones.
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {tab.tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {hasTrend ? (
          <ManagerTrendChart
            points={series.points}
            min={series.min}
            max={series.max}
            color={seriesColor}
            variant={active.variant}
            formatValue={active.format}
          />
        ) : (
          <View className="items-center py-6">
            <Text className="font-inter-semibold text-[12.5px] text-slate-600">
              Not enough data yet
            </Text>
            <Text className="mt-0.5 text-center font-inter text-[11px] text-slate-400">
              The trend appears once this month has activity on two or more
              days.
            </Text>
          </View>
        )}
      </View>
    </SummaryCardShell>
  );
};
