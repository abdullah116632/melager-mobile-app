import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import type { AppColors } from "@/types/theme";
import { getCurrentDepositDate } from "@/utils/deposit";
import { depositStyles as styles } from "./depositStyles";

interface DepositDatePickerProps {
  visible: boolean;
  initialDate: string;
  colors: AppColors;
  onClose: () => void;
  onSelect: (date: string) => void;
}

export const DepositDatePicker = ({
  visible,
  initialDate,
  colors,
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
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable
          style={[styles.datePickerSheet, { backgroundColor: colors.card }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.pickerTitleRow}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
              Select date
            </Text>
            <View style={styles.pickerHeaderActions}>
              <Feather name="calendar" size={23} color={DEPOSIT_PRIMARY} />
              <TouchableOpacity
                style={[
                  styles.pickerCloseButton,
                  { backgroundColor: colors.secondary },
                ]}
                onPress={onClose}
                accessibilityLabel="Close date picker"
              >
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.monthSelectRow}>
            <TouchableOpacity
              style={styles.monthArrow}
              onPress={() => setCursor(new Date(year, month - 1, 1))}
            >
              <Feather name="chevron-left" size={20} color={DEPOSIT_PRIMARY} />
            </TouchableOpacity>
            <Text
              style={[styles.monthSelectTitle, { color: colors.foreground }]}
            >
              {cursor.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity
              style={styles.monthArrow}
              onPress={() => setCursor(new Date(year, month + 1, 1))}
            >
              <Feather name="chevron-right" size={20} color={DEPOSIT_PRIMARY} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekdayRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
              <Text
                key={`${day}-${index}`}
                style={[styles.weekdayText, { color: colors.mutedForeground }]}
              >
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.dateGrid}>
            {Array.from({ length: 42 }, (_, index) => {
              const day = index - firstDay + 1;
              if (day < 1 || day > daysInMonth) {
                return <View key={index} style={styles.dateCell} />;
              }
              const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const selected = date === initialDate;
              const isToday = date === today;
              return (
                <TouchableOpacity
                  key={date}
                  style={styles.dateCell}
                  onPress={() => onSelect(date)}
                >
                  <View
                    style={[
                      styles.dateNumber,
                      selected && { backgroundColor: DEPOSIT_PRIMARY },
                      isToday &&
                        !selected && {
                          borderColor: DEPOSIT_PRIMARY,
                          borderWidth: 1,
                        },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateCellText,
                        { color: selected ? "#fff" : colors.foreground },
                      ]}
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
