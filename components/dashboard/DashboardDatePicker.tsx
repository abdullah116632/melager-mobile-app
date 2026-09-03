import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DashboardDatePickerProps {
  visible: boolean;
  value: string;
  title: string;
  fixedYearMonth?: string;
  maximumDate?: string;
  dayMarkers?: Record<string, string[]>;
  markersLoading?: boolean;
  onVisibleMonthChange?: (yearMonth: string) => void;
  onClose: () => void;
  onSelect: (date: string) => void;
}

export const DashboardDatePicker = ({
  visible,
  value,
  title,
  fixedYearMonth,
  maximumDate,
  dayMarkers,
  markersLoading = false,
  onVisibleMonthChange,
  onClose,
  onSelect,
}: DashboardDatePickerProps) => {
  const [viewYearMonth, setViewYearMonth] = useState(
    fixedYearMonth ?? value.slice(0, 7),
  );

  useEffect(() => {
    if (!visible) return;
    const nextYearMonth = fixedYearMonth ?? value.slice(0, 7);
    setViewYearMonth(nextYearMonth);
    onVisibleMonthChange?.(nextYearMonth);
  }, [fixedYearMonth, onVisibleMonthChange, visible, value]);

  const [year, month] = viewYearMonth.split("-").map(Number);
  const daysInMonth = new Date(year!, month!, 0).getDate();
  const leadingBlanks = new Date(year!, month! - 1, 1).getDay();
  const cells: Array<number | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, weekIndex) =>
    cells.slice(weekIndex * 7, weekIndex * 7 + 7),
  );

  const changeMonth = (offset: number) => {
    const next = new Date(year!, month! - 1 + offset, 1);
    const nextYearMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    setViewYearMonth(nextYearMonth);
    onVisibleMonthChange?.(nextYearMonth);
  };
  const monthLabel = new Date(year!, month! - 1, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-slate-900/45 p-5">
        <TouchableOpacity
          className="absolute inset-0"
          onPress={onClose}
          activeOpacity={1}
        />
        <View className="w-full max-w-[380px] rounded-[18px] border border-slate-200 bg-white p-4 shadow-2xl">
          <View className="mb-3 flex-row items-center">
            <Text className="flex-1 font-inter-bold text-base text-slate-900">
              {title}
            </Text>
            {markersLoading ? (
              <ActivityIndicator
                size="small"
                color="#0F766E"
                style={{ marginRight: 6 }}
              />
            ) : null}
            <TouchableOpacity
              className="h-[34px] w-[34px] items-center justify-center"
              onPress={onClose}
            >
              <Feather name="x" size={19} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View className="mb-2.5 flex-row items-center">
            {fixedYearMonth ? (
              <View className="h-[38px] w-[38px]" />
            ) : (
              <TouchableOpacity
                className="h-[38px] w-[38px] items-center justify-center"
                onPress={() => changeMonth(-1)}
              >
                <Feather name="chevron-left" size={21} color="#0F172A" />
              </TouchableOpacity>
            )}
            <Text className="flex-1 text-center font-inter-semibold text-[15px] text-slate-900">
              {monthLabel}
            </Text>
            {fixedYearMonth ? (
              <View className="h-[38px] w-[38px]" />
            ) : (
              <TouchableOpacity
                className="h-[38px] w-[38px] items-center justify-center"
                onPress={() => changeMonth(1)}
              >
                <Feather name="chevron-right" size={21} color="#0F172A" />
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <Text
                key={day}
                className="flex-1 py-[7px] text-center font-inter-semibold text-[10px] text-slate-500"
              >
                {day}
              </Text>
            ))}
          </View>
          <View>
            {weeks.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} className="flex-row">
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return (
                      <View
                        key={`blank-${weekIndex}-${dayIndex}`}
                        className="h-[42px] flex-1 items-center justify-center"
                      />
                    );
                  }
                  const date = `${viewYearMonth}-${String(day).padStart(2, "0")}`;
                  const selected = date === value;
                  const disabled = Boolean(maximumDate && date > maximumDate);
                  const markers = dayMarkers?.[date] ?? [];
                  const marked = markers.length > 0;
                  return (
                    <TouchableOpacity
                      key={date}
                      className="h-[50px] flex-1 items-center justify-center"
                      onPress={() => onSelect(date)}
                      activeOpacity={0.7}
                      disabled={disabled}
                      style={{ opacity: disabled ? 0.3 : 1 }}
                    >
                      <View
                        className="h-[44px] w-[40px] items-center justify-center rounded-xl"
                        style={
                          marked
                            ? {
                                backgroundColor: "#FEF2F2",
                                borderColor: selected ? "#0F766E" : "#FCA5A5",
                                borderWidth: selected ? 2 : 1,
                              }
                            : selected
                              ? { backgroundColor: "#0F766E" }
                              : undefined
                        }
                      >
                        <Text
                          className="text-center font-inter-medium text-[13px] leading-[17px] [include-font-padding:false]"
                          style={{
                            color: marked
                              ? "#B91C1C"
                              : selected
                                ? "#FFFFFF"
                                : "#0F172A",
                          }}
                        >
                          {day}
                        </Text>
                        {marked ? (
                          <View className="h-3 flex-row items-center justify-center gap-[2px]">
                            {markers.map((marker) => (
                              <Text
                                key={`${date}-${marker}`}
                                className="font-inter-bold text-[8px] leading-[10px] text-red-700"
                              >
                                {marker}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};
