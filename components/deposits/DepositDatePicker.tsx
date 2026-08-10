import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import { getCurrentDepositDate } from "@/utils/deposit";

interface DepositDatePickerProps {
  visible: boolean;
  initialDate: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}

export const DepositDatePicker = ({
  visible,
  initialDate,
  onClose,
  onSelect,
}: DepositDatePickerProps) => {
  const [cursor, setCursor] = useState(new Date());

  useEffect(() => {
    if (!visible) return;
    const [year, month, day] = initialDate.split("-").map(Number);
    setCursor(
      new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1),
    );
  }, [visible, initialDate]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = getCurrentDepositDate();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center bg-black/45 px-[22px]"
        onPress={onClose}
      >
        <Pressable
          className="rounded-[20px] bg-white p-[18px]"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="mb-3.5 flex-row items-center justify-between">
            <Text className="font-inter-bold text-base text-slate-900">
              Select date
            </Text>
            <View className="flex-row items-center gap-2.5">
              <Feather name="calendar" size={23} color={DEPOSIT_PRIMARY} />
              <TouchableOpacity
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                onPress={onClose}
                accessibilityLabel="Close date picker"
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
          <View className="mb-3 flex-row items-center justify-between">
            <TouchableOpacity
              className="h-[34px] w-[34px] items-center justify-center rounded-full"
              onPress={() => setCursor(new Date(year, month - 1, 1))}
            >
              <Feather name="chevron-left" size={20} color={DEPOSIT_PRIMARY} />
            </TouchableOpacity>
            <Text className="font-inter-bold text-[15px] text-slate-900">
              {cursor.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity
              className="h-[34px] w-[34px] items-center justify-center rounded-full"
              onPress={() => setCursor(new Date(year, month + 1, 1))}
            >
              <Feather name="chevron-right" size={20} color={DEPOSIT_PRIMARY} />
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
              const selected = date === initialDate;
              const isToday = date === today;
              return (
                <TouchableOpacity
                  key={date}
                  className="h-10 w-[14.285%] items-center justify-center"
                  onPress={() => onSelect(date)}
                >
                  <View
                    className={`h-[34px] w-[34px] items-center justify-center rounded-full ${selected ? "bg-teal-700" : isToday ? "border border-teal-700" : ""}`}
                  >
                    <Text
                      className={`font-inter-medium text-[13px] leading-[18px] [include-font-padding:false] ${selected ? "text-white" : "text-slate-900"}`}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
