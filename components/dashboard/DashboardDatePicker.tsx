import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

interface DashboardDatePickerProps {
  visible: boolean;
  value: string;
  title: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}

export const DashboardDatePicker = ({
  visible,
  value,
  title,
  onClose,
  onSelect,
}: DashboardDatePickerProps) => {
  const [viewYearMonth, setViewYearMonth] = useState(value.slice(0, 7));

  useEffect(() => {
    if (visible) setViewYearMonth(value.slice(0, 7));
  }, [visible, value]);

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
    setViewYearMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
    );
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
            <TouchableOpacity
              className="h-[34px] w-[34px] items-center justify-center"
              onPress={onClose}
            >
              <Feather name="x" size={19} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View className="mb-2.5 flex-row items-center">
            <TouchableOpacity
              className="h-[38px] w-[38px] items-center justify-center"
              onPress={() => changeMonth(-1)}
            >
              <Feather name="chevron-left" size={21} color="#0F172A" />
            </TouchableOpacity>
            <Text className="flex-1 text-center font-inter-semibold text-[15px] text-slate-900">
              {monthLabel}
            </Text>
            <TouchableOpacity
              className="h-[38px] w-[38px] items-center justify-center"
              onPress={() => changeMonth(1)}
            >
              <Feather name="chevron-right" size={21} color="#0F172A" />
            </TouchableOpacity>
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
                  return (
                    <TouchableOpacity
                      key={date}
                      className="h-[42px] flex-1 items-center justify-center"
                      onPress={() => onSelect(date)}
                      activeOpacity={0.7}
                    >
                      <View
                        className={`h-9 w-9 items-center justify-center rounded-full ${selected ? "bg-teal-700" : "bg-transparent"}`}
                      >
                        <Text
                          className={`text-center font-inter-medium text-[13px] leading-[18px] [include-font-padding:false] ${selected ? "text-white" : "text-slate-900"}`}
                        >
                          {day}
                        </Text>
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
