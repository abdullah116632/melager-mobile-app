import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MEAL_LABELS } from "@/constants/mealStatus";
import type { MealDraftItem, MealType } from "@/types/mealStatus";
import { formatTime12Hour } from "@/utils/mealStatus";
import { TimePickerModal } from "./TimePickerModal";

export type MealScheduleTextField = "menu" | "start" | "end";

type TimePickerField = "start" | "end";

const DEFAULT_WINDOWS: Record<MealType, { start: string; end: string }> = {
  breakfast: { start: "04:00", end: "08:00" },
  lunch: { start: "08:00", end: "13:00" },
  dinner: { start: "13:00", end: "17:00" },
};

// Full class strings so NativeWind can see them at build time.
const MEAL_ACCENTS: Record<MealType, { color: string; iconBorder: string }> = {
  breakfast: { color: "#D97706", iconBorder: "border-amber-200" },
  lunch: { color: "#0284C7", iconBorder: "border-sky-200" },
  dinner: { color: "#4F46E5", iconBorder: "border-indigo-200" },
};

interface MealScheduleItemProps {
  mealType: MealType;
  meal: MealDraftItem;
  isLast: boolean;
  isPast: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onFieldChange: (field: MealScheduleTextField, value: string) => void;
  onSave: () => void;
  saving: boolean;
  dirty: boolean;
}

const TimeChip = ({
  label,
  value,
  placeholder,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    className="h-8 w-[76px] items-center justify-center rounded-lg border border-teal-200 bg-white"
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={`${label} time`}
  >
    <Text
      className={`font-inter-semibold text-[12px] ${value ? "text-teal-900" : "text-teal-600/60"}`}
    >
      {formatTime12Hour(value || placeholder)}
    </Text>
  </TouchableOpacity>
);

export const MealScheduleItem = ({
  mealType,
  meal,
  isLast,
  isPast,
  onEnabledChange,
  onFieldChange,
  onSave,
  saving,
  dirty,
}: MealScheduleItemProps) => {
  const [timePickerField, setTimePickerField] =
    useState<TimePickerField | null>(null);
  const defaultWindow = DEFAULT_WINDOWS[mealType];
  const accent = MEAL_ACCENTS[mealType];
  const showSave = dirty || saving;

  return (
    <View
      className={`py-4 ${isLast ? "" : "border-b border-slate-300/70"} ${isPast ? "opacity-50" : ""}`}
      accessibilityState={{ disabled: isPast }}
    >
      <View>
        {/* Title row */}
        <View className="flex-row items-center">
          <View
            className={`h-11 w-11 items-center justify-center rounded-2xl border bg-white ${accent.iconBorder}`}
          >
            {mealType === "breakfast" ? (
              <Feather name="sunrise" size={20} color={accent.color} />
            ) : (
              <Ionicons
                name={mealType === "lunch" ? "sunny-outline" : "moon-outline"}
                size={21}
                color={accent.color}
              />
            )}
          </View>
          <View className="ml-3 flex-1">
            <Text className="font-inter-bold text-[16px] text-slate-900">
              {MEAL_LABELS[mealType]}
            </Text>
            <View
              className={`mt-1 flex-row items-center gap-1.5 self-start rounded-full border px-2 py-0.5 ${
                meal.enabled
                  ? "border-emerald-100 bg-emerald-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <View
                className={`h-1.5 w-1.5 rounded-full ${meal.enabled ? "bg-emerald-500" : "bg-slate-400"}`}
              />
              <Text
                className={`font-inter-semibold text-[10.5px] ${meal.enabled ? "text-emerald-700" : "text-slate-500"}`}
              >
                {meal.enabled ? "Meal is enabled" : "Meal is disabled"}
              </Text>
            </View>
          </View>
          <Switch
            value={meal.enabled}
            onValueChange={onEnabledChange}
            disabled={isPast || saving}
            trackColor={{ false: "#CBD5E1", true: "#99F6E4" }}
            thumbColor={meal.enabled ? "#0F766E" : "#F8FAFC"}
            ios_backgroundColor="#CBD5E1"
          />
        </View>

        {/* Menu */}
        {meal.enabled && (
          <View className="mt-3.5">
            <Text className="mb-1.5 font-inter-semibold text-[11px] text-teal-800/70">
              Menu
            </Text>
            <View className="flex-row items-center rounded-xl border border-teal-200 bg-white px-3">
              <Feather name="book-open" size={14} color="#14B8A6" />
              <TextInput
                className="ml-2 h-11 flex-1 font-inter text-sm text-slate-900"
                placeholder={`What's for ${MEAL_LABELS[mealType].toLowerCase()}? (optional)`}
                placeholderTextColor="#7FB8B1"
                value={meal.menu}
                onChangeText={(value) => onFieldChange("menu", value)}
                editable={!isPast && !saving}
                maxLength={80}
                returnKeyType="done"
              />
            </View>
          </View>
        )}

        {/* On/off window */}
        <View className="mt-3 flex-row items-center">
          <Feather name="clock" size={12} color="#14B8A6" />
          <Text className="ml-1.5 flex-1 font-inter-medium text-[11px] text-teal-800/70">
            On/off window
          </Text>
          <TimeChip
            label="From"
            value={meal.start}
            placeholder={defaultWindow.start}
            disabled={isPast || saving}
            onPress={() => setTimePickerField("start")}
          />
          <Text className="mx-1.5 font-inter-semibold text-[13px] text-teal-300">
            –
          </Text>
          <TimeChip
            label="To"
            value={meal.end}
            placeholder={defaultWindow.end}
            disabled={isPast || saving}
            onPress={() => setTimePickerField("end")}
          />
        </View>

        {showSave && (
          <TouchableOpacity
            className="mt-3 h-10 flex-row items-center justify-center gap-1.5 rounded-xl bg-teal-600 shadow-sm shadow-teal-900/20"
            onPress={onSave}
            disabled={saving || isPast}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Save ${MEAL_LABELS[mealType]}`}
          >
            {saving ? (
              <ActivityIndicator size={14} color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check" size={14} color="#FFFFFF" />
                <Text className="font-inter-semibold text-[13px] text-white">
                  Save {MEAL_LABELS[mealType]}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
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
