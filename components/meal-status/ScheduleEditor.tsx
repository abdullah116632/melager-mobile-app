import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MEAL_ICONS, MEAL_LABELS, MEAL_TYPES } from "@/constants/mealStatus";
import type { MealDraft, MealType } from "@/types/mealStatus";
import { formatTime12Hour } from "@/utils/mealStatus";

type TextField = "menu" | "start" | "end";

interface ScheduleEditorProps {
  draft: MealDraft;
  isPast: boolean;
  saving: boolean;
  onEnabledChange: (mealType: MealType, enabled: boolean) => void;
  onTextFieldChange: (
    mealType: MealType,
    field: TextField,
    value: string,
  ) => void;
  onOpenTimePicker: (value: string, onChange: (value: string) => void) => void;
}

export const ScheduleEditor = ({
  draft,
  isPast,
  saving,
  onEnabledChange,
  onTextFieldChange,
  onOpenTimePicker,
}: ScheduleEditorProps) => (
  <View className="mx-4 mb-3.5 rounded-2xl border border-slate-200 bg-white p-4">
    <Text className="mb-3.5 font-inter-bold text-[15px] text-slate-900">
      Schedule
    </Text>
    {isPast && (
      <View className="mb-2 flex-row items-center gap-[7px] rounded-[9px] border border-slate-200 bg-slate-100 p-2.5">
        <Feather name="lock" size={13} color="#64748B" />
        <Text className="font-inter-medium text-xs text-slate-500">
          Past schedules are read only.
        </Text>
      </View>
    )}

    {MEAL_TYPES.map((mealType, index) => {
      const meal = draft[mealType];
      const isLast = index === MEAL_TYPES.length - 1;

      return (
        <View
          key={mealType}
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
              onValueChange={(value) => onEnabledChange(mealType, value)}
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
              onChangeText={(value) =>
                onTextFieldChange(mealType, "menu", value)
              }
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
                onPress={() =>
                  onOpenTimePicker(meal.start, (value) =>
                    onTextFieldChange(mealType, "start", value),
                  )
                }
                disabled={isPast}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-inter-medium text-xs ${meal.start ? "text-slate-900" : "text-slate-500"}`}
                >
                  {formatTime12Hour(meal.start || "07:00")}
                </Text>
              </TouchableOpacity>
              <Text className="font-inter-semibold text-sm text-slate-500">
                –
              </Text>
              <TouchableOpacity
                className="h-[34px] w-[78px] items-center justify-center rounded-lg border-[1.5px] border-slate-200 bg-slate-50"
                onPress={() =>
                  onOpenTimePicker(meal.end, (value) =>
                    onTextFieldChange(mealType, "end", value),
                  )
                }
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
        </View>
      );
    })}

    <View className="mb-3.5 mt-3.5 flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <Feather name="info" size={12} color="#64748B" />
      <Text className="flex-1 font-inter text-[11px] text-slate-500">
        Changes save automatically. Today&apos;s meal and window changes apply
        to future dates; future-date changes apply only to that date.
      </Text>
    </View>

    {!isPast && (
      <View className="min-h-7 flex-row items-center justify-center gap-1.5">
        {saving ? (
          <ActivityIndicator size={13} color="#0F766E" />
        ) : (
          <Feather name="check-circle" size={14} color="#059669" />
        )}
        <Text
          className={`font-inter-medium text-xs ${saving ? "text-teal-700" : "text-slate-500"}`}
        >
          {saving ? "Saving changes..." : "Changes save automatically"}
        </Text>
      </View>
    )}
  </View>
);
