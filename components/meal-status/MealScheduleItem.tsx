import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MEAL_ICONS, MEAL_LABELS } from "@/constants/mealStatus";
import type { MealDraftItem, MealType } from "@/types/mealStatus";
import { formatTime12Hour } from "@/utils/mealStatus";
import { TimePickerModal } from "./TimePickerModal";

export type MealScheduleTextField = "menu" | "start" | "end";

type TimePickerField = "start" | "end";

interface MealScheduleItemProps {
  mealType: MealType;
  meal: MealDraftItem;
  isLast: boolean;
  isPast: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onFieldChange: (field: MealScheduleTextField, value: string) => void;
}

export const MealScheduleItem = ({
  mealType,
  meal,
  isLast,
  isPast,
  onEnabledChange,
  onFieldChange,
}: MealScheduleItemProps) => {
  const [timePickerField, setTimePickerField] =
    useState<TimePickerField | null>(null);

  const openTimePicker = (field: TimePickerField) => {
    setTimePickerField(field);
  };

  return (
    <View
      className={`py-3.5 ${isLast ? "" : "border-b-[0.5px] border-slate-200"}`}
    >
      <View className="mb-2 flex-row items-center gap-2">
        <Text className="text-lg">{MEAL_ICONS[mealType]}</Text>
        <Text className="font-inter-semibold text-[15px] text-slate-900">
          {MEAL_LABELS[mealType]}
        </Text>
        <View className="flex-1" />
        <Text
          className={`font-inter-medium text-xs ${meal.enabled ? "text-emerald-600" : "text-slate-500"}`}
        >
          {meal.enabled ? "Active" : "Disabled"}
        </Text>
        <Switch
          value={meal.enabled}
          onValueChange={onEnabledChange}
          disabled={isPast}
          trackColor={{ false: "#D1D5DB", true: "#6EE7B7" }}
          thumbColor={meal.enabled ? "#059669" : "#9CA3AF"}
        />
      </View>

      {meal.enabled && (
        <TextInput
          className="mb-2 h-[42px] rounded-[10px] border-[1.5px] border-slate-200 bg-slate-50 px-3 font-inter text-sm text-slate-900"
          placeholder="Menu (optional)"
          placeholderTextColor="#64748B"
          value={meal.menu}
          onChangeText={(value) => onFieldChange("menu", value)}
          editable={!isPast}
          maxLength={80}
        />
      )}

      <View className="flex-row items-center gap-1.5">
        <Feather name="clock" size={12} color="#64748B" className="mt-px" />
        <Text className="font-inter text-[11px] text-slate-500">
          On/off window
        </Text>
        <View className="ml-auto flex-row items-center gap-1.5">
          <TouchableOpacity
            className="h-[34px] w-[78px] items-center justify-center rounded-lg border-[1.5px] border-slate-200 bg-slate-50"
            onPress={() => openTimePicker("start")}
            disabled={isPast}
            activeOpacity={0.7}
          >
            <Text
              className={`font-inter-medium text-xs ${meal.start ? "text-slate-900" : "text-slate-500"}`}
            >
              {formatTime12Hour(meal.start || "07:00")}
            </Text>
          </TouchableOpacity>
          <Text className="font-inter-semibold text-sm text-slate-500">–</Text>
          <TouchableOpacity
            className="h-[34px] w-[78px] items-center justify-center rounded-lg border-[1.5px] border-slate-200 bg-slate-50"
            onPress={() => openTimePicker("end")}
            disabled={isPast}
            activeOpacity={0.7}
          >
            <Text
              className={`font-inter-medium text-xs ${meal.end ? "text-slate-900" : "text-slate-500"}`}
            >
              {formatTime12Hour(meal.end || "09:30")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TimePickerModal
        visible={timePickerField !== null}
        initialValue={timePickerField ? meal[timePickerField] : ""}
        onClose={() => setTimePickerField(null)}
        onSelect={(value) => {
          if (timePickerField) onFieldChange(timePickerField, value);
          setTimePickerField(null);
        }}
      />
    </View>
  );
};
