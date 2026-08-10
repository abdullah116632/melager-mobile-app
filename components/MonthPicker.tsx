import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

import { useMess } from "@/context/MessContext";

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
  onCellLeft?: () => void;
  onCellRight?: () => void;
  onCellUp?: () => void;
  onCellDown?: () => void;
  cellNavEnabled?: boolean;
}

export default function MonthPicker({
  accentColor,
  variant = "default",
  onCellLeft,
  onCellRight,
  onCellUp,
  onCellDown,
  cellNavEnabled = false,
}: MonthPickerProps) {
  const { currentYearMonth, currentMonthLabel, goToMonth } = useMess();
  const [visible, setVisible] = useState(false);
  const [currentYear, currentMonth] = currentYearMonth.split("-").map(Number);
  const [pickerYear, setPickerYear] = useState(currentYear);
  const accent = accentColor ?? DEFAULT_ACCENT_COLOR;
  const usesDefaultAccent = accent.toUpperCase() === DEFAULT_ACCENT_COLOR;
  const isDashboard = variant === "dashboard";
  const hasCellNavigation = Boolean(
    onCellLeft && onCellRight && onCellUp && onCellDown,
  );
  const navigationIconColor =
    cellNavEnabled || isDashboard ? accent : "#64748B";

  const openPicker = () => {
    setPickerYear(currentYear);
    setVisible(true);
  };

  const selectMonth = (month: number) => {
    goToMonth(pickerYear, month);
    setVisible(false);
  };

  const handleArrow = (callback?: () => void) => {
    if (!cellNavEnabled) return;
    callback?.();
  };

  const monthButton = (
    <TouchableOpacity
      className={`flex-row items-center justify-center gap-[7px] rounded-full py-2 ${isDashboard ? `${hasCellNavigation ? "min-w-[148px] px-3" : "min-w-[166px] px-4"} border border-slate-200 bg-white shadow-lg shadow-slate-400/20` : "min-w-[166px] bg-slate-100 px-4"}`}
      onPress={openPicker}
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
        className={`flex-row items-center px-3 py-2.5 ${isDashboard ? "z-20 -mt-4 bg-transparent" : "border-b border-slate-200 bg-white"}`}
      >
        {hasCellNavigation ? (
          <>
            <View
              className={`flex-1 flex-row items-center justify-end ${isDashboard ? "mt-1.5 gap-1.5 pr-1.5" : "gap-3 pr-4"}`}
            >
              <TouchableOpacity
                className={`${isDashboard ? "h-[30px] w-[30px] border border-slate-200 bg-white shadow-sm" : "h-8 w-8 bg-slate-100"} items-center justify-center rounded-full ${cellNavEnabled ? "opacity-100" : isDashboard ? "opacity-70" : "opacity-40"}`}
                onPress={() => handleArrow(onCellLeft)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <Feather
                  name="chevron-left"
                  size={18}
                  color={navigationIconColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                className={`${isDashboard ? "h-[30px] w-[30px] border border-slate-200 bg-white shadow-sm" : "h-8 w-8 bg-slate-100"} items-center justify-center rounded-full ${cellNavEnabled ? "opacity-100" : isDashboard ? "opacity-70" : "opacity-40"}`}
                onPress={() => handleArrow(onCellRight)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
              >
                <Feather
                  name="chevron-right"
                  size={18}
                  color={navigationIconColor}
                />
              </TouchableOpacity>
            </View>

            <View className="flex-none items-center justify-center">
              {monthButton}
            </View>

            <View
              className={`flex-1 flex-row items-center justify-start ${isDashboard ? "mt-1.5 gap-1.5 pl-1.5" : "gap-3 pl-4"}`}
            >
              <TouchableOpacity
                className={`${isDashboard ? "h-[30px] w-[30px] border border-slate-200 bg-white shadow-sm" : "h-8 w-8 bg-slate-100"} items-center justify-center rounded-full ${cellNavEnabled ? "opacity-100" : isDashboard ? "opacity-70" : "opacity-40"}`}
                onPress={() => handleArrow(onCellUp)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
              >
                <Feather
                  name="chevron-up"
                  size={16}
                  color={navigationIconColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                className={`${isDashboard ? "h-[30px] w-[30px] border border-slate-200 bg-white shadow-sm" : "h-8 w-8 bg-slate-100"} items-center justify-center rounded-full ${cellNavEnabled ? "opacity-100" : isDashboard ? "opacity-70" : "opacity-40"}`}
                onPress={() => handleArrow(onCellDown)}
                disabled={!cellNavEnabled}
                activeOpacity={0.7}
                hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name="chevron-down"
                  size={16}
                  color={navigationIconColor}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View className="flex-1 items-center justify-center">
            {monthButton}
          </View>
        )}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/45 px-7"
          onPress={() => setVisible(false)}
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
                className="p-1"
                onPress={() => setVisible(false)}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
              <TouchableOpacity
                className="p-1.5"
                onPress={() => setPickerYear((year) => year - 1)}
              >
                <Feather name="chevron-left" size={22} color={accent} />
              </TouchableOpacity>
              <Text className="font-inter-bold text-xl text-slate-900">
                {pickerYear}
              </Text>
              <TouchableOpacity
                className="p-1.5"
                onPress={() => setPickerYear((year) => year + 1)}
              >
                <Feather name="chevron-right" size={22} color={accent} />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap px-2.5 pb-4">
              {MONTHS_SHORT.map((name, index) => {
                const month = index + 1;
                const isSelected =
                  month === currentMonth && pickerYear === currentYear;
                const usesCustomSelectedColor =
                  isSelected && !usesDefaultAccent;

                return (
                  <View key={month} className="w-1/4 p-[5px]">
                    <TouchableOpacity
                      className={`items-center justify-center rounded-[10px] border py-[11px] ${isSelected ? (usesDefaultAccent ? "border-teal-700 bg-teal-700" : "border-transparent") : "border-slate-200 bg-white"}`}
                      style={
                        usesCustomSelectedColor
                          ? {
                              backgroundColor: accent,
                              borderColor: accent,
                            }
                          : undefined
                      }
                      onPress={() => selectMonth(month)}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-[13px] ${isSelected ? "font-inter-bold text-white" : "font-inter-medium text-slate-900"}`}
                      >
                        {name}
                      </Text>
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
