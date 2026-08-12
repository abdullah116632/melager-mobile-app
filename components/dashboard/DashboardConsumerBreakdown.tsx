import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type {
  DashboardAccounting,
  DashboardDatePickerTarget,
  DashboardDateRange,
} from "@/types/dashboard";
import {
  formatDashboardAmount,
  formatDashboardRate,
  formatDashboardShortDate,
} from "@/utils/dashboard";

interface DashboardConsumerBreakdownProps {
  accounting: DashboardAccounting;
  consumerCount: number;
  appliedRange: DashboardDateRange | null;
  draftStartDate: string;
  draftEndDate: string;
  hasUnappliedDateChange: boolean;
  rangeLoading: boolean;
  pdfGenerating: boolean;
  onOpenDatePicker: (target: DashboardDatePickerTarget) => void;
  onApplyRange: () => void;
  onDownloadPdf: () => void;
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
    flexBasis: 0,
    flexGrow: COLUMN_WEIGHTS.consumer,
    flexShrink: 1,
  },
  meals: {
    flexBasis: 0,
    flexGrow: COLUMN_WEIGHTS.meals,
    flexShrink: 1,
  },
  cost: {
    flexBasis: 0,
    flexGrow: COLUMN_WEIGHTS.cost,
    flexShrink: 1,
  },
  deposit: {
    flexBasis: 0,
    flexGrow: COLUMN_WEIGHTS.deposit,
    flexShrink: 1,
  },
  balance: {
    flexBasis: 0,
    flexGrow: COLUMN_WEIGHTS.balance,
    flexShrink: 1,
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

export const DashboardConsumerBreakdown = ({
  accounting,
  consumerCount,
  appliedRange,
  draftStartDate,
  draftEndDate,
  hasUnappliedDateChange,
  rangeLoading,
  pdfGenerating,
  onOpenDatePicker,
  onApplyRange,
  onDownloadPdf,
}: DashboardConsumerBreakdownProps) => {
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [tableViewportWidth, setTableViewportWidth] = useState(0);
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

  if (consumerCount === 0) {
    return (
      <View className="items-center gap-2.5 px-10 py-10">
        <Feather name="users" size={40} color="#64748B" />
        <Text className="font-inter-semibold text-base text-slate-900">
          No consumers yet
        </Text>
        <Text className="text-center font-inter text-[13px] text-slate-500">
          Add consumers from the Meals tab
        </Text>
      </View>
    );
  }

  return (
    <View
      className="mx-4 mb-2 overflow-hidden rounded-[20px] border border-slate-200 bg-white"
      style={{
        shadowColor: "#94A3B8",
        shadowOpacity: 0.16,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      <View className="flex-row items-center border-b border-teal-100 bg-[#F0FCFA] px-3.5 py-[14px]">
        <View className="h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-teal-100">
          <Feather name="bar-chart-2" size={22} color="#047857" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="mb-0.5 font-inter-bold text-[9px] leading-3 tracking-[1.4px] text-slate-500">
            ACCOUNTING OVERVIEW
          </Text>
          <Text className="font-inter-bold text-[18px] leading-[23px] tracking-[-0.2px] text-slate-950">
            Consumer Breakdown
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          {appliedRange && (
            <View
              key="custom-range-badge"
              className="flex-row items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-[9px] py-[5px]"
            >
              <Feather name="calendar" size={12} color="#6D28D9" />
              <Text className="font-inter-bold text-[10px] text-violet-700">
                Custom
              </Text>
            </View>
          )}
          <TouchableOpacity
            key="pdf-button"
            className={`h-[38px] flex-row items-center justify-center gap-1.5 rounded-[11px] border border-emerald-300 bg-white px-3 ${pdfGenerating ? "opacity-60" : "opacity-100"}`}
            style={{
              shadowColor: "#6EE7B7",
              shadowOpacity: 0.18,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 1,
            }}
            onPress={onDownloadPdf}
            disabled={pdfGenerating}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Download Consumer Breakdown PDF"
          >
            {pdfGenerating ? (
              <ActivityIndicator size={15} color="#0F766E" />
            ) : (
              <Feather name="download" size={16} color="#0F766E" />
            )}
            <Text className="font-inter-bold text-[12px] text-teal-700">
              PDF
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {appliedRange && (
        <View
          key="applied-range-summary"
          className="flex-row items-center justify-center gap-[7px] px-3.5 pt-2.5"
        >
          <View className="h-[0.5px] flex-1 bg-violet-200" />
          <Text className="font-inter-semibold text-[11px] text-violet-700">
            {formatDashboardShortDate(appliedRange.startDate)}
          </Text>
          <Feather name="arrow-right" size={13} color="#7C3AED" />
          <Text className="font-inter-semibold text-[11px] text-violet-700">
            {formatDashboardShortDate(appliedRange.endDate)}
          </Text>
          <View className="h-[0.5px] flex-1 bg-violet-200" />
        </View>
      )}

      <View className="px-3.5 pb-3.5 pt-3">
        <View className="flex-row gap-2.5">
          {[
            ["start", "Start Date", draftStartDate],
            ["end", "End Date", draftEndDate],
          ].map(([target, label, value]) => (
            <View key={target} className="flex-1 gap-[5px]">
              <Text className="font-inter-semibold text-[12px] text-slate-600">
                {label}
              </Text>
              <TouchableOpacity
                className="h-[48px] flex-row items-center gap-2 rounded-[11px] border border-slate-200 bg-white px-3"
                style={{
                  shadowColor: "#94A3B8",
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 1,
                }}
                onPress={() =>
                  onOpenDatePicker(target as DashboardDatePickerTarget)
                }
                activeOpacity={0.75}
              >
                <Feather name="calendar" size={16} color="#0F766E" />
                <Text
                  className="flex-1 font-inter-semibold text-[12px] text-slate-900"
                  numberOfLines={1}
                >
                  {formatDashboardShortDate(value)}
                </Text>
                <Feather name="chevron-down" size={14} color="#64748B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
        {hasUnappliedDateChange && (
          <TouchableOpacity
            key="apply-range-button"
            className={`mt-2.5 flex-row items-center justify-center gap-1.5 rounded-[11px] bg-teal-700 py-3 ${rangeLoading ? "opacity-60" : "opacity-100"}`}
            onPress={onApplyRange}
            disabled={rangeLoading}
            activeOpacity={0.8}
          >
            {rangeLoading ? (
              <ActivityIndicator size={15} color="#fff" />
            ) : (
              <Feather name="check" size={15} color="#fff" />
            )}
            <Text className="font-inter-semibold text-[13px] text-white">
              {rangeLoading ? "Loading…" : "Apply"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
                <View
                  key={row.id}
                  className={`relative h-[43px] flex-row items-center border-b-[0.5px] border-slate-300 ${index % 2 === 0 ? "bg-slate-50" : "bg-[#EDF2F7]"}`}
                >
                  <Text
                    className="px-2.5 font-inter text-[13px] text-slate-900"
                    style={COLUMN_STYLES.consumer}
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                  <Text
                    className="text-center font-inter-medium text-[13px] text-slate-900"
                    style={COLUMN_STYLES.meals}
                  >
                    {row.meals}
                  </Text>
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
                </View>
              );
            })}

            <View className="relative h-[44px] flex-row items-center bg-[#08766E]">
              <Text
                className="px-2.5 font-inter-bold text-[13px] text-white"
                style={COLUMN_STYLES.consumer}
              >
                Total
              </Text>
              <Text
                className="text-center font-inter-bold text-[13px] text-white"
                style={COLUMN_STYLES.meals}
              >
                {totalMeals}
              </Text>
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
              className={`h-[43px] justify-center border-b-[0.5px] border-r-[0.5px] border-slate-300 pl-2.5 pr-2 ${index % 2 === 0 ? "bg-slate-50" : "bg-[#EDF2F7]"}`}
            >
              <Text
                className="font-inter text-[13px] text-slate-900"
                numberOfLines={1}
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
    </View>
  );
};
