import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { useMess } from "@/redux/hooks";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DEFAULT_ACCENT_COLOR = "#0F766E";

interface MonthPickerProps {
  accentColor?: string;
  variant?: "default" | "dashboard";
  monthDataLoading?: boolean;
  onSwitchMess?: () => void;
  onCellLeft?: () => void;
  onCellRight?: () => void;
  onCellUp?: () => void;
  onCellDown?: () => void;
  cellNavEnabled?: boolean;
  showSyncStatus?: boolean;
}

export default function MonthPicker({
  accentColor,
  variant = "default",
  monthDataLoading = false,
  onSwitchMess,
  onCellLeft,
  onCellRight,
  onCellUp,
  onCellDown,
  cellNavEnabled = false,
  showSyncStatus = true,
}: MonthPickerProps) {
  const {
    currentYearMonth,
    currentMonthLabel,
    dataSource,
    lastRefreshError,
    goToMonth,
  } = useMess();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [waitingForSelectedMonth, setWaitingForSelectedMonth] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState<{
    year: number;
    month: number;
  } | null>(null);
  const [selectedMonthRequestFinished, setSelectedMonthRequestFinished] =
    useState(false);
  const monthChangeFrame = useRef<number | null>(null);
  const [currentYear, currentMonth] = currentYearMonth.split("-").map(Number);
  const [pickerYear, setPickerYear] = useState(currentYear);
  const accent = accentColor ?? DEFAULT_ACCENT_COLOR;
  const usesDefaultAccent = accent.toUpperCase() === DEFAULT_ACCENT_COLOR;
  const isDashboard = variant === "dashboard";
  const isCompact = width < 380;
  const hasCellNavigation = Boolean(
    onCellLeft && onCellRight && onCellUp && onCellDown,
  );
  const navigationIconColor = cellNavEnabled ? "#0369A1" : "#3B82F6";
  const refreshFailureLabel =
    dataSource === "none"
      ? "Refresh failed. Please check your connection and try again."
      : "Refresh failed. Showing saved data.";

  useEffect(() => {
    if (
      !waitingForSelectedMonth ||
      !selectedMonthRequestFinished ||
      monthDataLoading
    ) {
      return;
    }
    setWaitingForSelectedMonth(false);
    setSelectedMonthRequestFinished(false);
    setLoadingMonth(null);
    setVisible(false);
  }, [monthDataLoading, selectedMonthRequestFinished, waitingForSelectedMonth]);

  useEffect(() => {
    if (!waitingForSelectedMonth) return;
    const timeout = setTimeout(() => {
      setWaitingForSelectedMonth(false);
      setSelectedMonthRequestFinished(false);
      setLoadingMonth(null);
      setVisible(false);
    }, 22_000);
    return () => clearTimeout(timeout);
  }, [waitingForSelectedMonth]);

  useEffect(
    () => () => {
      if (monthChangeFrame.current !== null) {
        cancelAnimationFrame(monthChangeFrame.current);
      }
    },
    [],
  );

  const openPicker = () => {
    setPickerYear(currentYear);
    setVisible(true);
  };

  const selectMonth = (month: number) => {
    if (pickerYear === currentYear && month === currentMonth) {
      setVisible(false);
      return;
    }
    const selectedYear = pickerYear;
    setLoadingMonth({ year: selectedYear, month });
    setSelectedMonthRequestFinished(false);
    setWaitingForSelectedMonth(true);
    monthChangeFrame.current = requestAnimationFrame(() => {
      monthChangeFrame.current = null;
      void goToMonth(selectedYear, month)
        .catch(() => undefined)
        .finally(() => setSelectedMonthRequestFinished(true));
    });
  };

  const closePicker = () => {
    if (waitingForSelectedMonth) return;
    setVisible(false);
  };

  const handleArrow = (callback?: () => void) => {
    if (!cellNavEnabled) return;
    callback?.();
  };

  const monthButton = (
    <TouchableOpacity
      className={`flex-row items-center justify-center gap-[7px] rounded-full py-2 ${isDashboard ? `${hasCellNavigation ? (isCompact ? "min-w-[132px] px-2" : "min-w-[148px] px-3") : isCompact ? "min-w-[150px] px-3" : "min-w-[166px] px-4"} border border-slate-200 bg-white shadow-lg shadow-slate-400/20` : "min-w-[166px] bg-slate-100 px-4"}`}
      onPress={openPicker}
      disabled={monthDataLoading}
      activeOpacity={0.75}
    >
      <Feather name="calendar" size={14} color={accent} />
      <Text
        className="font-inter-semibold text-[15px] text-slate-900"
        numberOfLines={1}
      >
        {currentMonthLabel}
      </Text>
      <Feather name="chevron-down" size={13} color="#64748B" />
    </TouchableOpacity>
  );

  return (
    <>
      <View
        className={`flex-row items-center py-2.5 ${hasCellNavigation ? "px-1.5" : "px-3"} ${isDashboard ? "z-20 -mt-4 bg-transparent" : "border-b border-slate-200 bg-white"}`}
      >
        {hasCellNavigation ? (
          <>
            <View
              className={`flex-1 flex-row items-center justify-end ${isDashboard ? `mt-3 ${isCompact ? "gap-2" : "gap-4"} pr-1` : "gap-3 pr-4"}`}
            >
              <TouchableOpacity
                className={`${isDashboard ? "h-[38px] w-[38px] border-2 shadow-md" : "h-8 w-8 bg-slate-100"} ${isDashboard && (cellNavEnabled ? "border-sky-400 bg-sky-100 shadow-sky-500/20" : "border-blue-200 bg-white shadow-blue-300/15")} items-center justify-center rounded-full ${cellNavEnabled ? "opacity-100" : isDashboard ? "opacity-85" : "opacity-40"}`}
                onPress={() => handleArrow(onCellLeft)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                accessibilityLabel="Copy meal to left cell"
              >
                <Feather
                  name="chevron-left"
                  size={22}
                  color={navigationIconColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                className={`${isDashboard ? "h-[38px] w-[38px] border-2 shadow-md" : "h-8 w-8 bg-slate-100"} ${isDashboard && (cellNavEnabled ? "border-sky-400 bg-sky-100 shadow-sky-500/20" : "border-blue-200 bg-white shadow-blue-300/15")} items-center justify-center rounded-full ${cellNavEnabled ? "opacity-100" : isDashboard ? "opacity-85" : "opacity-40"}`}
                onPress={() => handleArrow(onCellRight)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                accessibilityLabel="Copy meal to right cell"
              >
                <Feather
                  name="chevron-right"
                  size={22}
                  color={navigationIconColor}
                />
              </TouchableOpacity>
            </View>

            <View className="flex-none items-center justify-center self-start">
              {monthButton}
            </View>

            <View
              className={`flex-1 flex-row items-center justify-start ${isDashboard ? `mt-3 ${isCompact ? "gap-2" : "gap-4"} pl-1` : "gap-3 pl-4"}`}
            >
              <TouchableOpacity
                className={`${isDashboard ? "h-[38px] w-[38px] border-2 shadow-md" : "h-8 w-8 bg-slate-100"} ${isDashboard && (cellNavEnabled ? "border-sky-400 bg-sky-100 shadow-sky-500/20" : "border-blue-200 bg-white shadow-blue-300/15")} items-center justify-center rounded-full ${cellNavEnabled ? "opacity-100" : isDashboard ? "opacity-85" : "opacity-40"}`}
                onPress={() => handleArrow(onCellUp)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                accessibilityLabel="Copy meal to upper cell"
              >
                <Feather
                  name="chevron-up"
                  size={21}
                  color={navigationIconColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                className={`${isDashboard ? "h-[38px] w-[38px] border-2 shadow-md" : "h-8 w-8 bg-slate-100"} ${isDashboard && (cellNavEnabled ? "border-sky-400 bg-sky-100 shadow-sky-500/20" : "border-blue-200 bg-white shadow-blue-300/15")} items-center justify-center rounded-full ${cellNavEnabled ? "opacity-100" : isDashboard ? "opacity-85" : "opacity-40"}`}
                onPress={() => handleArrow(onCellDown)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                accessibilityLabel="Copy meal to lower cell"
              >
                <Feather
                  name="chevron-down"
                  size={21}
                  color={navigationIconColor}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View className="relative flex-1 items-center justify-center">
            {isDashboard && onSwitchMess ? (
              <TouchableOpacity
                className="absolute left-1 h-10 w-10 items-center justify-center rounded-xl border border-teal-100 bg-white shadow-md shadow-slate-400/20"
                style={{ transform: [{ translateY: 11 }] }}
                onPress={onSwitchMess}
                activeOpacity={0.72}
                accessibilityRole="button"
                accessibilityLabel="Switch mess"
                accessibilityHint="Go to the mess selection page"
              >
                <Feather name="repeat" size={19} color="#0F766E" />
              </TouchableOpacity>
            ) : null}
            {monthButton}
          </View>
        )}
      </View>

      {showSyncStatus && lastRefreshError ? (
        <View className="mx-3 mb-2 flex-row items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <Feather name="alert-triangle" size={15} color="#B45309" />
          <Text className="flex-1 font-inter-medium text-xs text-amber-800">
            {refreshFailureLabel}
          </Text>
        </View>
      ) : showSyncStatus && dataSource === "cache" ? (
        <View className="mx-3 mb-2 flex-row items-center gap-2">
          <Feather name="wifi-off" size={13} color="#64748B" />
          <Text className="font-inter text-xs text-slate-500">
            Offline/cached data
          </Text>
        </View>
      ) : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
        statusBarTranslucent
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/45 px-7"
          onPress={closePicker}
        >
          <Pressable
            className="w-full max-w-[380px] overflow-hidden rounded-[20px] bg-white shadow-2xl shadow-black/15"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="flex-row items-center justify-between border-b-[0.5px] border-slate-200 px-[18px] py-3.5">
              <Text className="font-inter-bold text-base text-slate-900">
                Select Month
              </Text>
              <TouchableOpacity
                className={`p-1 ${waitingForSelectedMonth ? "opacity-40" : "opacity-100"}`}
                onPress={closePicker}
                disabled={waitingForSelectedMonth}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
              <TouchableOpacity
                className="p-1.5"
                onPress={() => setPickerYear((year) => year - 1)}
                disabled={waitingForSelectedMonth}
              >
                <Feather name="chevron-left" size={22} color={accent} />
              </TouchableOpacity>
              <Text className="font-inter-bold text-xl text-slate-900">
                {pickerYear}
              </Text>
              <TouchableOpacity
                className="p-1.5"
                onPress={() => setPickerYear((year) => year + 1)}
                disabled={waitingForSelectedMonth}
              >
                <Feather name="chevron-right" size={22} color={accent} />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap px-2.5 pb-4">
              {MONTHS_SHORT.map((name, index) => {
                const month = index + 1;
                const isSelected =
                  month === currentMonth && pickerYear === currentYear;
                const isLoadingMonth =
                  waitingForSelectedMonth &&
                  loadingMonth?.year === pickerYear &&
                  loadingMonth.month === month;
                const isHighlighted = isSelected || isLoadingMonth;
                const usesCustomSelectedColor =
                  isHighlighted && !usesDefaultAccent;

                return (
                  <View key={month} className="w-1/4 p-[5px]">
                    <TouchableOpacity
                      className={`items-center justify-center rounded-[10px] border py-[11px] ${isHighlighted ? (usesDefaultAccent ? "border-teal-700 bg-teal-700" : "border-transparent") : "border-slate-200 bg-white"}`}
                      style={
                        usesCustomSelectedColor
                          ? {
                              backgroundColor: accent,
                              borderColor: accent,
                            }
                          : undefined
                      }
                      onPress={() => selectMonth(month)}
                      disabled={waitingForSelectedMonth}
                      activeOpacity={0.7}
                    >
                      {isLoadingMonth ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text
                          className={`text-[13px] ${isHighlighted ? "font-inter-bold text-white" : "font-inter-medium text-slate-900"}`}
                        >
                          {name}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
