import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";

interface DepositTimePickerProps {
  visible: boolean;
  initialTime: string;
  onClose: () => void;
  onSelect: (time: string) => void;
}

export const DepositTimePicker = ({
  visible,
  initialTime,
  onClose,
  onSelect,
}: DepositTimePickerProps) => {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (!visible) return;
    const [rawHour, rawMinute] = initialTime.split(":").map(Number);
    const validHour = Number.isInteger(rawHour) && rawHour >= 0 && rawHour < 24;
    setHour(validHour ? rawHour % 12 || 12 : 12);
    setMinute(Number.isInteger(rawMinute) ? rawMinute : 0);
    setPeriod(validHour && rawHour >= 12 ? "PM" : "AM");
  }, [visible, initialTime]);

  const selectTime = () => {
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
        className="flex-1 justify-center bg-black/45 px-[22px]"
        onPress={onClose}
      >
        <Pressable
          className="max-h-[88%] rounded-[20px] bg-white p-5"
          onPress={(event) => event.stopPropagation()}
        >
          <View className="mb-3.5 flex-row items-center justify-between">
            <View>
              <Text className="font-inter-bold text-base text-slate-900">
                Select time
              </Text>
              <Text className="mt-0.5 font-inter-bold text-[27px] text-teal-700">
                {hour}:{String(minute).padStart(2, "0")} {period}
              </Text>
            </View>
            <View className="flex-row items-center gap-2.5">
              <Feather name="clock" size={26} color={DEPOSIT_PRIMARY} />
              <TouchableOpacity
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                onPress={onClose}
                accessibilityLabel="Close time picker"
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          <Text className="mb-2 font-inter-semibold text-xs text-slate-500">
            Hour
          </Text>
          <View className="mb-[15px] flex-row flex-wrap gap-[7px]">
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (value) => (
                <TouchableOpacity
                  key={value}
                  className={`h-[34px] w-[14.3%] items-center justify-center rounded-lg border ${hour === value ? "border-teal-700 bg-teal-700" : "border-slate-200"}`}
                  onPress={() => setHour(value)}
                >
                  <Text
                    className={`font-inter-semibold text-xs ${hour === value ? "text-white" : "text-slate-900"}`}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
          <View className="-mt-[7px] mb-[15px] flex-row gap-2.5">
            {(["AM", "PM"] as const).map((value) => (
              <TouchableOpacity
                key={value}
                className={`h-9 flex-1 items-center justify-center rounded-lg border ${period === value ? "border-teal-700 bg-teal-700" : "border-slate-200"}`}
                onPress={() => setPeriod(value)}
              >
                <Text
                  className={`font-inter-bold text-[13px] ${period === value ? "text-white" : "text-slate-900"}`}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="mb-2 font-inter-semibold text-xs text-slate-500">
            Minute
          </Text>
          <View className="mb-[15px] flex-row flex-wrap gap-[7px]">
            {Array.from({ length: 12 }, (_, index) => index * 5).map(
              (value) => (
                <TouchableOpacity
                  key={value}
                  className={`h-[34px] w-[14.3%] items-center justify-center rounded-lg border ${minute === value ? "border-teal-700 bg-teal-700" : "border-slate-200"}`}
                  onPress={() => setMinute(value)}
                >
                  <Text
                    className={`font-inter-semibold text-xs ${minute === value ? "text-white" : "text-slate-900"}`}
                  >
                    {String(value).padStart(2, "0")}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
          <TouchableOpacity
            className="mt-px h-11 items-center justify-center rounded-[11px] bg-teal-700"
            onPress={selectTime}
          >
            <Text className="font-inter-bold text-sm text-white">Set time</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
