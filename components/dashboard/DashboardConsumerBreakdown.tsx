import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/redux/hooks";
import { useMess } from "@/redux/hooks";
import { exportDashboardBreakdownPdf } from "@/services/dashboardPdfService";
import type {
  DashboardAccounting,
  DashboardDatePickerTarget,
  DashboardDateRange,
} from "@/types/dashboard";
import {
  formatDashboardShortDate,
  getDefaultDashboardRange,
} from "@/utils/dashboard";
import { DashboardBreakdownTable } from "./DashboardBreakdownTable";
import { DashboardDatePicker } from "./DashboardDatePicker";

interface DashboardConsumerBreakdownProps {
  accounting: DashboardAccounting;
  appliedRange: DashboardDateRange | null;
  draftStartDate: string;
  draftEndDate: string;
  rangeLoading: boolean;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApplyRange: () => void;
}

export const DashboardConsumerBreakdown = ({
  accounting,
  appliedRange,
  draftStartDate,
  draftEndDate,
  rangeLoading,
  onStartDateChange,
  onEndDateChange,
  onApplyRange,
}: DashboardConsumerBreakdownProps) => {
  const { mess } = useAuth();
  const { currentYearMonth } = useMess();
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [datePickerTarget, setDatePickerTarget] =
    useState<DashboardDatePickerTarget | null>(null);
  const consumerCount = accounting.consumerRows.length;
  const defaultRange = getDefaultDashboardRange(currentYearMonth);
  const appliedStartDate = appliedRange?.startDate ?? defaultRange.startDate;
  const appliedEndDate = appliedRange?.endDate ?? defaultRange.endDate;
  const hasUnappliedDateChange =
    draftStartDate !== appliedStartDate || draftEndDate !== appliedEndDate;

  const downloadBreakdownPdf = async () => {
    if (pdfGenerating) return;
    setPdfGenerating(true);
    try {
      await exportDashboardBreakdownPdf({
        ...accounting,
        messName: mess?.name ?? "Mess",
        periodStart: appliedStartDate,
        periodEnd: appliedEndDate,
        consumerCount,
      });
    } catch (error) {
      Alert.alert(
        "PDF Error",
        error instanceof Error ? error.message : "Could not generate the PDF.",
      );
    } finally {
      setPdfGenerating(false);
    }
  };

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
    <>
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
              onPress={() => void downloadBreakdownPdf()}
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
                    setDatePickerTarget(target as DashboardDatePickerTarget)
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

        <DashboardBreakdownTable
          accounting={accounting}
          appliedRange={appliedRange}
        />
      </View>

      <DashboardDatePicker
        visible={datePickerTarget !== null}
        value={datePickerTarget === "end" ? draftEndDate : draftStartDate}
        title={
          datePickerTarget === "end" ? "Select End Date" : "Select Start Date"
        }
        onClose={() => setDatePickerTarget(null)}
        onSelect={(date) => {
          if (datePickerTarget === "start") onStartDateChange(date);
          if (datePickerTarget === "end") onEndDateChange(date);
          setDatePickerTarget(null);
        }}
      />
    </>
  );
};
