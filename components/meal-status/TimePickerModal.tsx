import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import type { AppColors } from "@/types/theme";
import { mealStatusStyles as styles } from "./mealStatusStyles";

interface TimePickerModalProps {
  visible: boolean;
  initialValue: string;
  colors: AppColors;
  onClose: () => void;
  onSelect: (value: string) => void;
}

export const TimePickerModal = ({
  visible,
  initialValue,
  colors,
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

  const clockSize = 252;
  const clockCenter = clockSize / 2;
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
      <Pressable style={styles.timePickerBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.timePickerSheet, { backgroundColor: colors.card }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.timePickerHeader}>
            <Text
              style={[styles.timePickerTitle, { color: colors.foreground }]}
            >
              Select time
            </Text>
            <TouchableOpacity
              style={[
                styles.timePickerClose,
                { backgroundColor: colors.secondary },
              ]}
              onPress={onClose}
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.timeDisplayPanel,
              { backgroundColor: colors.secondary },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.timeDisplayPart,
                mode === "hour" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setMode("hour")}
            >
              <Text
                style={[
                  styles.timeDisplayPartText,
                  { color: mode === "hour" ? "#fff" : colors.foreground },
                ]}
              >
                {String(hour).padStart(2, "0")}
              </Text>
            </TouchableOpacity>
            <Text
              style={[styles.timeDisplayColon, { color: colors.foreground }]}
            >
              :
            </Text>
            <TouchableOpacity
              style={[
                styles.timeDisplayPart,
                mode === "minute" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setMode("minute")}
            >
              <Text
                style={[
                  styles.timeDisplayPartText,
                  { color: mode === "minute" ? "#fff" : colors.foreground },
                ]}
              >
                {String(minute).padStart(2, "0")}
              </Text>
            </TouchableOpacity>
            <View style={styles.periodStack}>
              {(["AM", "PM"] as const).map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.periodChip,
                    period === value && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setPeriod(value)}
                >
                  <Text
                    style={[
                      styles.periodChipText,
                      {
                        color:
                          period === value ? "#fff" : colors.mutedForeground,
                      },
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text
            style={[styles.clockModeHint, { color: colors.mutedForeground }]}
          >
            {mode === "hour" ? "Choose hour" : "Choose minute"}
          </Text>
          <View
            style={[
              styles.clockFace,
              {
                width: clockSize,
                height: clockSize,
                borderRadius: clockSize / 2,
                backgroundColor: colors.secondary,
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.clockHandLayer,
                {
                  width: clockSize,
                  height: clockSize,
                  transform: [{ rotate: `${selectedIndex * 30}deg` }],
                },
              ]}
            >
              <View
                style={[
                  styles.clockHand,
                  {
                    backgroundColor: colors.primary,
                    height: clockRadius - 18,
                    top: clockCenter - clockRadius + 18,
                  },
                ]}
              />
              <View
                style={[
                  styles.clockCenterDot,
                  { backgroundColor: colors.primary },
                ]}
              />
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
                  style={[
                    styles.clockNumber,
                    { left, top },
                    isSelected && { backgroundColor: colors.primary },
                  ]}
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
                    style={[
                      styles.clockNumberText,
                      { color: isSelected ? "#fff" : colors.foreground },
                    ]}
                  >
                    {mode === "minute" ? String(value).padStart(2, "0") : value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.timePickerActions}>
            <TouchableOpacity
              style={[styles.timePickerClear, { borderColor: colors.border }]}
              onPress={() => onSelect("")}
            >
              <Text
                style={[
                  styles.timePickerClearText,
                  { color: colors.foreground },
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timePickerSave,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleSave}
            >
              <Text style={styles.timePickerSaveText}>Set time</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
