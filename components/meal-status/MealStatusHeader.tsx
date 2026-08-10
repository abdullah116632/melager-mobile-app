import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import type { AppColors } from "@/types/theme";
import { formatDateLabel } from "@/utils/mealStatus";
import { mealStatusStyles as styles } from "./mealStatusStyles";

interface MealStatusHeaderProps {
  colors: AppColors;
  selectedDate: string;
  today: string;
  isAtFutureLimit: boolean;
  onBack: () => void;
  onPreviousDate: () => void;
  onNextDate: () => void;
  onToday: () => void;
  onRefresh: () => void;
}

export const MealStatusHeader = ({
  colors,
  selectedDate,
  today,
  isAtFutureLimit,
  onBack,
  onPreviousDate,
  onNextDate,
  onToday,
  onRefresh,
}: MealStatusHeaderProps) => {
  const isToday = selectedDate === today;

  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Feather name="arrow-left" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.dateNav}>
        <TouchableOpacity
          onPress={onPreviousDate}
          activeOpacity={0.7}
          style={styles.navArrow}
        >
          <Feather
            name="chevron-left"
            size={18}
            color="rgba(255,255,255,0.8)"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={isToday ? undefined : onToday}
          activeOpacity={isToday ? 1 : 0.7}
          style={styles.dateCenter}
        >
          <Text style={styles.datePrimary}>
            {formatDateLabel(selectedDate, today)}
          </Text>
          {!isToday && <Text style={styles.dateSub}>Tap → Today</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNextDate}
          activeOpacity={0.7}
          style={[styles.navArrow, isAtFutureLimit && { opacity: 0.35 }]}
          disabled={isAtFutureLimit}
        >
          <Feather
            name="chevron-right"
            size={18}
            color="rgba(255,255,255,0.8)"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onRefresh}
        activeOpacity={0.7}
      >
        <Feather name="refresh-cw" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};
