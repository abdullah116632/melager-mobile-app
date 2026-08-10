import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AppColors } from "@/types/theme";
import { dashboardStyles as styles } from "./dashboardStyles";

interface DashboardDatePickerProps {
  colors: AppColors;
  visible: boolean;
  value: string;
  title: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}

export const DashboardDatePicker = ({
  colors,
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
      <View style={styles.pickerOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          style={[
            styles.pickerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.pickerTitleRow}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
              {title}
            </Text>
            <TouchableOpacity style={styles.pickerClose} onPress={onClose}>
              <Feather name="x" size={19} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={styles.pickerMonthRow}>
            <TouchableOpacity
              style={styles.pickerArrow}
              onPress={() => changeMonth(-1)}
            >
              <Feather
                name="chevron-left"
                size={21}
                color={colors.foreground}
              />
            </TouchableOpacity>
            <Text style={[styles.pickerMonth, { color: colors.foreground }]}>
              {monthLabel}
            </Text>
            <TouchableOpacity
              style={styles.pickerArrow}
              onPress={() => changeMonth(1)}
            >
              <Feather
                name="chevron-right"
                size={21}
                color={colors.foreground}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.pickerWeekRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <Text
                key={day}
                style={[
                  styles.pickerWeekday,
                  { color: colors.mutedForeground },
                ]}
              >
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.pickerGrid}>
            {cells.map((day, index) => {
              if (day === null) {
                return (
                  <View key={`blank-${index}`} style={styles.pickerDayCell} />
                );
              }
              const date = `${viewYearMonth}-${String(day).padStart(2, "0")}`;
              const selected = date === value;
              return (
                <TouchableOpacity
                  key={date}
                  style={styles.pickerDayCell}
                  onPress={() => onSelect(date)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.pickerDayCircle,
                      selected && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerDayText,
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
        </View>
      </View>
    </Modal>
  );
};
