import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type {
  DashboardAccounting,
  DashboardConsumerRow,
  DashboardDateRange,
} from "@/types/dashboard";
import {
  formatDashboardAmount,
  formatDashboardRate,
  formatDashboardShortDate,
} from "@/utils/dashboard";
import { DashboardConsumerDetailModal } from "./DashboardConsumerDetailModal";

interface DashboardBreakdownTableProps {
  accounting: DashboardAccounting;
  appliedRange: DashboardDateRange | null;
}

const MIN_TABLE_WIDTH = 536;
const COLUMN_WEIGHTS = {
  consumer: 21,
  meals: 14,
  cost: 21,
  deposit: 21,
  balance: 23,
} as const;
const TOTAL_COLUMN_WEIGHT = Object.values(COLUMN_WEIGHTS).reduce(
  (total, weight) => total + weight,
  0,
);
const CONSUMER_COLUMN_RATIO = COLUMN_WEIGHTS.consumer / TOTAL_COLUMN_WEIGHT;

const COLUMN_STYLES = {
  consumer: {
    width: `${COLUMN_WEIGHTS.consumer}%`,
  },
  meals: {
    width: `${COLUMN_WEIGHTS.meals}%`,
  },
  cost: {
    width: `${COLUMN_WEIGHTS.cost}%`,
  },
  deposit: {
    width: `${COLUMN_WEIGHTS.deposit}%`,
  },
  balance: {
    width: `${COLUMN_WEIGHTS.balance}%`,
  },
} as const;

const COLUMN_DIVIDER_PERCENTAGES = [
  COLUMN_WEIGHTS.consumer,
  COLUMN_WEIGHTS.consumer + COLUMN_WEIGHTS.meals,
  COLUMN_WEIGHTS.consumer + COLUMN_WEIGHTS.meals + COLUMN_WEIGHTS.cost,
  COLUMN_WEIGHTS.consumer +
    COLUMN_WEIGHTS.meals +
    COLUMN_WEIGHTS.cost +
    COLUMN_WEIGHTS.deposit,
];

const ColumnDividers = ({ dark = false }: { dark?: boolean }) => (
  <>
    {COLUMN_DIVIDER_PERCENTAGES.map((left) => (
      <View
        key={left}
        pointerEvents="none"
        className="absolute bottom-0 top-0"
        style={{
          left: `${left}%`,
          width: 1,
          zIndex: 2,
          backgroundColor: dark ? "rgba(255,255,255,0.32)" : "#CBD5E1",
        }}
      />
    ))}
  </>
);

const TableHeader = ({ consumerCount }: { consumerCount: number }) => (
  <View className="relative h-[42px] flex-row items-stretch bg-[#08766E]">
    <View className="justify-center px-2.5" style={COLUMN_STYLES.consumer}>
      <Text className="font-inter-semibold text-[11px] text-white">
        Consumers ({consumerCount})
      </Text>
    </View>
    {[
      ["Meals", COLUMN_STYLES.meals],
      ["Cost", COLUMN_STYLES.cost],
      ["Deposit", COLUMN_STYLES.deposit],
      ["Balance", COLUMN_STYLES.balance],
    ].map(([label, style]) => (
      <View
        key={label as string}
        className="items-center justify-center px-1"
        style={style as (typeof COLUMN_STYLES)[keyof typeof COLUMN_STYLES]}
      >
        <Text className="text-center font-inter-semibold text-[11px] text-white">
          {label as string}
        </Text>
      </View>
    ))}
    <ColumnDividers dark />
  </View>
);

export const DashboardBreakdownTable = ({
  accounting,
  appliedRange,
}: DashboardBreakdownTableProps) => {
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [tableViewportWidth, setTableViewportWidth] = useState(0);
  const [selectedConsumer, setSelectedConsumer] =
    useState<DashboardConsumerRow | null>(null);
  const tableWidth = Math.max(MIN_TABLE_WIDTH, tableViewportWidth);
  const fixedConsumerWidth = tableWidth * CONSUMER_COLUMN_RATIO;
  const {
    consumerRows,
    totalMeals,
    totalExpenses,
    totalDeposits,
    mealRate,
    netBalance,
  } = accounting;
  const consumerCount = consumerRows.length;

  return (
    <>
      <View
        className="relative"
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width > 0 && Math.abs(width - tableViewportWidth) > 0.5) {
            setTableViewportWidth(width);
          }
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              event.nativeEvent;
            setShowScrollHint(
              contentOffset.x < 6 &&
                contentSize.width > layoutMeasurement.width + 4,
            );
          }}
        >
          <View style={{ width: tableWidth }}>
            <TableHeader consumerCount={consumerCount} />
            {consumerRows.map((row, index) => {
              const positive = row.balance > 0.005;
              const negative = row.balance < -0.005;
              const balanceClassName = positive
                ? "text-emerald-600"
                : negative
                  ? "text-red-600"
                  : "text-slate-500";
              return (
                <TouchableOpacity
                  key={row.id}
                  className={`relative h-[52px] flex-row items-center border-b-[0.5px] border-slate-300 ${index % 2 === 0 ? "bg-slate-50" : "bg-[#EDF2F7]"}`}
                  onPress={() => setSelectedConsumer(row)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${row.name}`}
                >
                  <View
                    className="justify-center overflow-hidden px-2.5"
                    style={COLUMN_STYLES.consumer}
                  />
                  <View
                    className="items-center justify-center"
                    style={COLUMN_STYLES.meals}
                  >
                    <Text className="text-center font-inter-medium text-[13px] text-slate-900">
                      {row.meals}
                    </Text>
                  </View>
                  {[
                    { amount: row.cost, style: COLUMN_STYLES.cost },
                    { amount: row.deposits, style: COLUMN_STYLES.deposit },
                    {
                      amount: Math.abs(row.balance),
                      style: COLUMN_STYLES.balance,
                    },
                  ].map(({ amount, style }, amountIndex) => (
                    <Text
                      key={amountIndex}
                      className={`text-center text-[13px] ${amountIndex === 2 ? `font-inter-bold ${balanceClassName}` : "font-inter-medium text-slate-900"}`}
                      style={style}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {amountIndex === 2
                        ? positive
                          ? "+"
                          : negative
                            ? "-"
                            : ""
                        : ""}
                      ৳{formatDashboardAmount(amount)}
                    </Text>
                  ))}
                  <ColumnDividers />
                </TouchableOpacity>
              );
            })}

            <View className="relative h-[44px] flex-row items-center bg-[#08766E]">
              <Text
                className="px-2.5 font-inter-bold text-[13px] text-white"
                style={COLUMN_STYLES.consumer}
              >
                Total
              </Text>
              <View
                className="items-center justify-center"
                style={COLUMN_STYLES.meals}
              >
                <Text className="text-center font-inter-bold text-[13px] text-white">
                  {totalMeals}
                </Text>
              </View>
              {[
                { amount: totalExpenses, style: COLUMN_STYLES.cost },
                { amount: totalDeposits, style: COLUMN_STYLES.deposit },
                {
                  amount: Math.abs(netBalance),
                  style: COLUMN_STYLES.balance,
                },
              ].map(({ amount, style }, index) => (
                <Text
                  key={index}
                  className={`text-center font-inter-bold text-[13px] ${index === 2 ? (netBalance >= 0 ? "text-emerald-200" : "text-red-300") : "text-white"}`}
                  style={style}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {index === 2
                    ? netBalance > 0
                      ? "+"
                      : netBalance < 0
                        ? "-"
                        : ""
                    : ""}
                  ৳{formatDashboardAmount(amount)}
                </Text>
              ))}
              <ColumnDividers dark />
            </View>
          </View>
        </ScrollView>

        <View
          pointerEvents="none"
          className="absolute left-0 top-0 z-[2] shadow-md"
          style={{ width: fixedConsumerWidth }}
        >
          <View className="h-[42px] justify-center border-r-[0.5px] border-white/20 bg-[#08766E] pl-2.5 pr-2">
            <Text className="font-inter-semibold text-[11px] text-white">
              Consumers ({consumerCount})
            </Text>
          </View>
          {consumerRows.map((row, index) => (
            <View
              key={`fixed-${row.id}`}
              className={`h-[52px] justify-center overflow-hidden border-b-[0.5px] border-r-[0.5px] border-slate-300 pl-2.5 pr-2 ${index % 2 === 0 ? "bg-slate-50" : "bg-[#EDF2F7]"}`}
            >
              <Text
                className="font-inter text-[13px] leading-[17px] text-slate-900"
                numberOfLines={2}
                ellipsizeMode="clip"
              >
                {row.name}
              </Text>
            </View>
          ))}
          <View className="h-[44px] justify-center border-r-[0.5px] border-white/20 bg-[#08766E] pl-2.5 pr-2">
            <Text className="font-inter-bold text-[13px] text-white">
              Total
            </Text>
          </View>
        </View>

        {showScrollHint &&
          tableViewportWidth > 0 &&
          tableWidth > tableViewportWidth + 4 && (
            <View
              key="table-scroll-hint"
              pointerEvents="none"
              className="absolute right-[7px] top-[5px] z-[3] h-7 w-7 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100"
            >
              <Feather name="chevrons-right" size={20} color="#0F766E" />
            </View>
          )}
      </View>

      <View className="border-t-[0.5px] border-slate-200 px-3.5 py-2.5">
        <Text className="font-inter text-[11px] text-slate-500">
          {appliedRange
            ? `${formatDashboardShortDate(appliedRange.startDate)} – ${formatDashboardShortDate(appliedRange.endDate)} (inclusive) · rate ৳${formatDashboardRate(mealRate)}/meal`
            : mealRate > 0
              ? `Balance = Deposit − (Meals × ৳${formatDashboardRate(mealRate)}/meal)`
              : "Balance = Deposit − Cost"}
        </Text>
      </View>

      <DashboardConsumerDetailModal
        consumer={selectedConsumer}
        onClose={() => setSelectedConsumer(null)}
      />
    </>
  );
};
