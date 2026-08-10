import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { formatDateLabel } from "@/utils/mealStatus";

interface MealStatusHeaderProps {
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
    <View className="flex-row items-center gap-2 bg-teal-700 px-3 py-3">
      <TouchableOpacity
        className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-white/10"
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Feather name="arrow-left" size={20} color="#fff" />
      </TouchableOpacity>

      <View className="flex-1 flex-row items-center justify-center">
        <TouchableOpacity
          onPress={onPreviousDate}
          activeOpacity={0.7}
          className="p-1.5"
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
          className="min-w-[100px] items-center px-2"
        >
          <Text className="font-inter-bold text-base text-white">
            {formatDateLabel(selectedDate, today)}
          </Text>
          {!isToday && (
            <Text className="mt-px font-inter text-[10px] text-white/65">
              Tap → Today
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNextDate}
          activeOpacity={0.7}
          className={`p-1.5 ${isAtFutureLimit ? "opacity-35" : "opacity-100"}`}
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
        className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-white/10"
        onPress={onRefresh}
        activeOpacity={0.7}
      >
        <Feather name="refresh-cw" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};
