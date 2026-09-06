import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { DASHBOARD_MEAL_LABELS } from "@/constants/dashboard";
import type { DashboardMealType } from "@/types/dashboard";

interface MealOffOptionsSheetProps {
  visible: boolean;
  mealType: DashboardMealType | null;
  dateLabel: string;
  onSelect: (scope: "day" | "ongoing") => void;
  onClose: () => void;
}

const MealIcon = ({ mealType }: { mealType: DashboardMealType }) => (
  <View className="h-12 w-12 items-center justify-center rounded-full bg-teal-50">
    {mealType === "lunch" ? (
      <View className="h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-teal-600">
        <MaterialCommunityIcons
          name="silverware-fork-knife"
          size={18}
          color="#0F8A80"
        />
      </View>
    ) : (
      <Ionicons
        name={mealType === "breakfast" ? "sunny-outline" : "moon-outline"}
        size={24}
        color="#0F8A80"
      />
    )}
  </View>
);

export const MealOffOptionsSheet = ({
  visible,
  mealType,
  dateLabel,
  onSelect,
  onClose,
}: MealOffOptionsSheetProps) => {
  if (!mealType) return null;
  const mealLabel = DASHBOARD_MEAL_LABELS[mealType];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity
          className="absolute inset-0"
          onPress={onClose}
          activeOpacity={1}
        />
        <View className="w-full rounded-t-[28px] border-t border-slate-100 bg-white px-5 pb-safe-offset-6 pt-3 shadow-2xl shadow-black/20">
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-slate-200" />

          <View className="mb-5 flex-row items-center gap-3">
            <MealIcon mealType={mealType} />
            <View className="min-w-0 flex-1">
              <Text className="font-inter-bold text-[17px] text-slate-900">
                Turn off {mealLabel}
              </Text>
              <Text className="font-inter text-[12.5px] text-slate-500">
                Choose how long to keep it off
              </Text>
            </View>
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Feather name="x" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="mb-3 flex-row items-center gap-3 rounded-2xl border-[1.5px] border-slate-200 bg-slate-50 p-3.5"
            activeOpacity={0.7}
            onPress={() => onSelect("day")}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
              <Feather name="calendar" size={18} color="#0F766E" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-inter-semibold text-[14.5px] text-slate-900">
                Only for {dateLabel === "Today" ? "today" : dateLabel}
              </Text>
              <Text className="font-inter text-xs text-slate-500">
                Turns back on automatically afterwards
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            className="mb-4 flex-row items-center gap-3 rounded-2xl border-[1.5px] border-amber-200 bg-amber-50 p-3.5"
            activeOpacity={0.7}
            onPress={() => onSelect("ongoing")}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
              <Feather name="repeat" size={18} color="#B45309" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-inter-semibold text-[14.5px] text-slate-900">
                Until I turn it on
              </Text>
              <Text className="font-inter text-xs text-slate-500">
                Stays off every day ahead until you switch it back on
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            className="h-11 items-center justify-center rounded-[10px] border border-slate-200"
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Text className="font-inter-semibold text-sm text-slate-900">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
