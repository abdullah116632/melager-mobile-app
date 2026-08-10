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

const TableHeader = ({ consumerCount }: { consumerCount: number }) => (
  <View className="h-[42px] flex-row items-center bg-[#08766E] px-2.5">
    <Text className="w-[110px] font-inter-semibold text-[11px] text-white">
      Consumers ({consumerCount})
    </Text>
    <Text className="w-[52px] text-right font-inter-semibold text-[11px] text-white">
      Meals
    </Text>
    <Text className="w-[82px] text-right font-inter-semibold text-[11px] text-white">
      Cost
    </Text>
    <Text className="w-[82px] text-right font-inter-semibold text-[11px] text-white">
      Deposit
    </Text>
    <Text className="w-[90px] text-right font-inter-semibold text-[11px] text-white">
      Balance
    </Text>
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

      <View className="relative">
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
          <View className="w-[436px]">
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
                  className={`h-[43px] flex-row items-center border-b-[0.5px] border-slate-200 px-2.5 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                >
                  <Text
                    className="w-[110px] font-inter text-[13px] text-slate-900"
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                  <Text className="w-[52px] text-right font-inter-medium text-[13px] text-slate-900">
                    {row.meals}
                  </Text>
                  {[
                    { amount: row.cost, widthClassName: "w-[82px]" },
                    { amount: row.deposits, widthClassName: "w-[82px]" },
                    {
                      amount: Math.abs(row.balance),
                      widthClassName: "w-[90px]",
                    },
                  ].map(({ amount, widthClassName }, amountIndex) => (
                    <Text
                      key={amountIndex}
                      className={`${widthClassName} text-right text-[13px] ${amountIndex === 2 ? `font-inter-bold ${balanceClassName}` : "font-inter-medium text-slate-900"}`}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                    >
                      {amountIndex === 2 && positive ? "+" : ""}৳
                      {formatDashboardAmount(amount)}
                    </Text>
                  ))}
                </View>
              );
            })}

            <View className="h-[44px] flex-row items-center bg-[#08766E] px-2.5">
              <Text className="w-[110px] font-inter-bold text-[13px] text-white">
                Total
              </Text>
              <Text className="w-[52px] text-right font-inter-bold text-[13px] text-white">
                {totalMeals}
              </Text>
              {[
                { amount: totalExpenses, widthClassName: "w-[82px]" },
                { amount: totalDeposits, widthClassName: "w-[82px]" },
                {
                  amount: Math.abs(netBalance),
                  widthClassName: "w-[90px]",
                },
              ].map(({ amount, widthClassName }, index) => (
                <Text
                  key={index}
                  className={`${widthClassName} text-right font-inter-bold text-[13px] ${index === 2 ? (netBalance >= 0 ? "text-emerald-200" : "text-red-300") : "text-white"}`}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {index === 2 && netBalance >= 0 ? "+" : ""}৳
                  {formatDashboardAmount(amount)}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>

        <View
          pointerEvents="none"
          className="absolute left-0 top-0 z-[2] w-[120px] shadow-md"
        >
          <View className="h-[42px] justify-center bg-[#08766E] pl-2.5 pr-2">
            <Text className="font-inter-semibold text-[11px] text-white">
              Consumers ({consumerCount})
            </Text>
          </View>
          {consumerRows.map((row, index) => (
            <View
              key={`fixed-${row.id}`}
              className={`h-[43px] justify-center border-b-[0.5px] border-slate-200 pl-2.5 pr-2 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
            >
              <Text
                className="font-inter text-[13px] text-slate-900"
                numberOfLines={1}
              >
                {row.name}
              </Text>
            </View>
          ))}
          <View className="h-[44px] justify-center bg-[#08766E] pl-2.5 pr-2">
            <Text className="font-inter-bold text-[13px] text-white">
              Total
            </Text>
          </View>
        </View>

        {showScrollHint && (
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
