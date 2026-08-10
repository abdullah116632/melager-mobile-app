import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import type { AppColors } from "@/types/theme";
import { depositStyles as styles } from "./depositStyles";

interface DepositTimePickerProps {
  visible: boolean;
  initialTime: string;
  colors: AppColors;
  onClose: () => void;
  onSelect: (time: string) => void;
}

export const DepositTimePicker = ({
  visible,
  initialTime,
  colors,
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
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.timePickerSheet, { backgroundColor: colors.card }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.pickerTitleRow}>
            <View>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
                Select time
              </Text>
              <Text
                style={[styles.timePickerDisplay, { color: DEPOSIT_PRIMARY }]}
              >
                {hour}:{String(minute).padStart(2, "0")} {period}
              </Text>
            </View>
            <View style={styles.pickerHeaderActions}>
              <Feather name="clock" size={26} color={DEPOSIT_PRIMARY} />
              <TouchableOpacity
                style={[
                  styles.pickerCloseButton,
                  { backgroundColor: colors.secondary },
                ]}
                onPress={onClose}
                accessibilityLabel="Close time picker"
              >
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <Text
            style={[
              styles.pickerSectionLabel,
              { color: colors.mutedForeground },
            ]}
          >
            Hour
          </Text>
          <View style={styles.timePickerGrid}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.timePickerOption,
                    { borderColor: colors.border },
                    hour === value && {
                      backgroundColor: DEPOSIT_PRIMARY,
                      borderColor: DEPOSIT_PRIMARY,
                    },
                  ]}
                  onPress={() => setHour(value)}
                >
                  <Text
                    style={[
                      styles.timePickerOptionText,
                      { color: hour === value ? "#fff" : colors.foreground },
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
          <View style={styles.periodPickerRow}>
            {(["AM", "PM"] as const).map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.periodPickerOption,
                  { borderColor: colors.border },
                  period === value && {
                    backgroundColor: DEPOSIT_PRIMARY,
                    borderColor: DEPOSIT_PRIMARY,
                  },
                ]}
                onPress={() => setPeriod(value)}
              >
                <Text
                  style={[
                    styles.periodPickerText,
                    { color: period === value ? "#fff" : colors.foreground },
                  ]}
                >
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text
            style={[
              styles.pickerSectionLabel,
              { color: colors.mutedForeground },
            ]}
          >
            Minute
          </Text>
          <View style={styles.timePickerGrid}>
            {Array.from({ length: 12 }, (_, index) => index * 5).map(
              (value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.timePickerOption,
                    { borderColor: colors.border },
                    minute === value && {
                      backgroundColor: DEPOSIT_PRIMARY,
                      borderColor: DEPOSIT_PRIMARY,
                    },
                  ]}
                  onPress={() => setMinute(value)}
                >
                  <Text
                    style={[
                      styles.timePickerOptionText,
                      { color: minute === value ? "#fff" : colors.foreground },
                    ]}
                  >
                    {String(value).padStart(2, "0")}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.pickerConfirmButton,
              { backgroundColor: DEPOSIT_PRIMARY },
            ]}
            onPress={selectTime}
          >
            <Text style={styles.pickerConfirmText}>Set time</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
