import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

import { getDhakaDate } from "@/utils/dashboard";

const modalShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.22,
  shadowRadius: 24,
  elevation: 12,
};

interface BazarDatePickerProps {
  visible: boolean;
  selectedDate: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}

/** Month calendar for picking the day whose bazar list is shown. */
export const BazarDatePicker = ({
  visible,
  selectedDate,
  onClose,
  onSelect,
}: BazarDatePickerProps) => {
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    if (!visible) return;
    const [year, month, day] = selectedDate.split("-").map(Number);
    setCursor(
      new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1),
    );
  }, [visible, selectedDate]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = getDhakaDate();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-slate-900/45 px-6"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-[360px] overflow-hidden rounded-3xl bg-white"
          style={modalShadow}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="flex-row items-center border-b border-slate-100 px-4 py-3.5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <Feather name="calendar" size={18} color="#0369A1" />
            </View>
            <View className="ml-3 min-w-0 flex-1">
              <Text className="font-inter-bold text-base text-slate-900">
                Select bazar date
              </Text>
              <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
                Every date keeps its own list.
              </Text>
            </View>
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              onPress={onClose}
              accessibilityLabel="Close date picker"
            >
              <Feather name="x" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View className="px-4 pt-4">
            <View className="mb-3 flex-row items-center justify-between">
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                onPress={() => setCursor(new Date(year, month - 1, 1))}
                accessibilityLabel="Previous month"
              >
                <Feather name="chevron-left" size={18} color="#0369A1" />
              </TouchableOpacity>
              <Text className="font-inter-bold text-[15px] text-slate-900">
                {cursor.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                onPress={() => setCursor(new Date(year, month + 1, 1))}
                accessibilityLabel="Next month"
              >
                <Feather name="chevron-right" size={18} color="#0369A1" />
              </TouchableOpacity>
            </View>
            <View className="mb-1 flex-row">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <Text
                  key={`${day}-${index}`}
                  className="w-[14.285%] text-center font-inter-semibold text-[11px] text-slate-500"
                >
                  {day}
                </Text>
              ))}
            </View>
            <View className="flex-row flex-wrap">
              {Array.from({ length: 42 }, (_, index) => {
                const day = index - firstDay + 1;
                if (day < 1 || day > daysInMonth) {
                  return <View key={index} className="h-10 w-[14.285%]" />;
                }
                const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const selected = date === selectedDate;
                const isToday = date === today;
                return (
                  <TouchableOpacity
                    key={date}
                    className="h-10 w-[14.285%] items-center justify-center"
                    onPress={() => onSelect(date)}
                    accessibilityLabel={`Select ${date}`}
                  >
                    <View
                      className={`h-[34px] w-[34px] items-center justify-center rounded-full ${selected ? "bg-sky-600" : isToday ? "border border-sky-400 bg-sky-50" : ""}`}
                    >
                      <Text
                        className={`text-[13px] leading-[18px] [include-font-padding:false] ${selected ? "font-inter-bold text-white" : isToday ? "font-inter-semibold text-sky-700" : "font-inter-medium text-slate-900"}`}
                      >
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View className="mt-3 border-t border-slate-100 px-4 py-3">
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-xl border border-sky-200 bg-sky-50 py-2.5"
              onPress={() => onSelect(today)}
              accessibilityLabel="Jump to today"
            >
              <Feather name="corner-up-left" size={14} color="#0369A1" />
              <Text className="ml-2 font-inter-semibold text-xs text-sky-800">
                Go to today
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
