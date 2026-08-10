import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

interface TimePickerModalProps {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}

export const TimePickerModal = ({
  visible,
  initialValue,
  onClose,
  onSelect,
}: TimePickerModalProps) => {
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [mode, setMode] = useState<"hour" | "minute">("hour");

  useEffect(() => {
    if (!visible) return;
    const [savedHour, savedMinute] = initialValue.split(":").map(Number);
    const hasValidSavedHour =
      Number.isInteger(savedHour) && savedHour >= 0 && savedHour < 24;
    setHour(hasValidSavedHour ? savedHour % 12 || 12 : 7);
    setMinute(Number.isInteger(savedMinute) ? savedMinute : 0);
    setPeriod(hasValidSavedHour && savedHour >= 12 ? "PM" : "AM");
    setMode("hour");
  }, [visible, initialValue]);

  const clockCenter = 126;
  const clockRadius = 96;
  const clockValues =
    mode === "hour"
      ? Array.from({ length: 12 }, (_, index) => index + 1)
      : Array.from({ length: 12 }, (_, index) => index * 5);
  const selectedValue = mode === "hour" ? hour : minute;
  const selectedIndex = mode === "hour" ? hour % 12 : minute / 5;

  const handleSave = () => {
    const hour24 =
      period === "AM" ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
    onSelect(
      `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-center bg-black/45 px-6"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-[340px] self-center rounded-[22px] bg-white p-5"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-inter-bold text-base text-slate-900">
              Select time
            </Text>
            <TouchableOpacity
              className="h-[34px] w-[34px] items-center justify-center rounded-full bg-slate-100"
              onPress={onClose}
            >
              <Feather name="x" size={18} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View className="mb-2.5 flex-row items-center justify-center rounded-[14px] bg-slate-100 p-2.5">
            <TouchableOpacity
              className={`h-[54px] w-[68px] items-center justify-center rounded-[10px] ${mode === "hour" ? "bg-teal-700" : ""}`}
              onPress={() => setMode("hour")}
            >
              <Text
                className={`font-inter-bold text-[28px] ${mode === "hour" ? "text-white" : "text-slate-900"}`}
              >
                {String(hour).padStart(2, "0")}
              </Text>
            </TouchableOpacity>
            <Text className="mx-1 font-inter-bold text-[28px] text-slate-900">
              :
            </Text>
            <TouchableOpacity
              className={`h-[54px] w-[68px] items-center justify-center rounded-[10px] ${mode === "minute" ? "bg-teal-700" : ""}`}
              onPress={() => setMode("minute")}
            >
              <Text
                className={`font-inter-bold text-[28px] ${mode === "minute" ? "text-white" : "text-slate-900"}`}
              >
                {String(minute).padStart(2, "0")}
              </Text>
            </TouchableOpacity>
            <View className="ml-2.5 gap-1">
              {(["AM", "PM"] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  className={`h-[25px] w-[42px] items-center justify-center rounded-[7px] ${period === value ? "bg-teal-700" : ""}`}
                  onPress={() => setPeriod(value)}
                >
                  <Text
                    className={`font-inter-bold text-[11px] ${period === value ? "text-white" : "text-slate-500"}`}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text className="mb-2 text-center font-inter-semibold text-xs text-slate-500">
            {mode === "hour" ? "Choose hour" : "Choose minute"}
          </Text>
          <View className="relative mb-[18px] h-[252px] w-[252px] self-center rounded-full bg-slate-100">
            <View
              pointerEvents="none"
              className="absolute left-0 top-0 h-[252px] w-[252px]"
              style={{ transform: [{ rotate: `${selectedIndex * 30}deg` }] }}
            >
              <View className="absolute left-1/2 top-12 ml-[-1px] h-[78px] w-[2px] rounded-sm bg-teal-700" />
              <View className="absolute left-1/2 top-1/2 -ml-[5px] -mt-[5px] h-2.5 w-2.5 rounded-full bg-teal-700" />
            </View>

            {clockValues.map((value) => {
              const dialIndex = mode === "hour" ? value % 12 : value / 5;
              const angle = (dialIndex * 30 * Math.PI) / 180;
              const left = clockCenter + clockRadius * Math.sin(angle) - 19;
              const top = clockCenter - clockRadius * Math.cos(angle) - 19;
              const isSelected = value === selectedValue;

              return (
                <TouchableOpacity
                  key={value}
                  className={`absolute h-[38px] w-[38px] items-center justify-center rounded-full ${isSelected ? "bg-teal-700" : ""}`}
                  style={{ left, top }}
                  onPress={() => {
                    if (mode === "hour") {
                      setHour(value);
                      setMode("minute");
                    } else {
                      setMinute(value);
                    }
                  }}
                >
                  <Text
                    className={`font-inter-semibold text-[13px] ${isSelected ? "text-white" : "text-slate-900"}`}
                  >
                    {mode === "minute" ? String(value).padStart(2, "0") : value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="mt-0.5 flex-row gap-2.5">
            <TouchableOpacity
              className="h-11 flex-1 items-center justify-center rounded-[10px] border border-slate-200"
              onPress={() => onSelect("")}
            >
              <Text className="font-inter-semibold text-sm text-slate-900">
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-11 flex-[2] items-center justify-center rounded-[10px] bg-teal-700"
              onPress={handleSave}
            >
              <Text className="font-inter-bold text-sm text-white">
                Set time
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
