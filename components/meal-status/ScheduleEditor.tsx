import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MEAL_ICONS, MEAL_LABELS, MEAL_TYPES } from "@/constants/mealStatus";
import type { MealDraft, MealType } from "@/types/mealStatus";
import type { AppColors } from "@/types/theme";
import { formatTime12Hour } from "@/utils/mealStatus";
import { mealStatusStyles as styles } from "./mealStatusStyles";

type TextField = "menu" | "start" | "end";

interface ScheduleEditorProps {
  colors: AppColors;
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
  colors,
  draft,
  isPast,
  saving,
  onEnabledChange,
  onTextFieldChange,
  onOpenTimePicker,
}: ScheduleEditorProps) => (
  <View
    style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
  >
    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
      Schedule
    </Text>
    {isPast && (
      <View
        style={[
          styles.readOnlyBanner,
          { backgroundColor: colors.secondary, borderColor: colors.border },
        ]}
      >
        <Feather name="lock" size={13} color={colors.mutedForeground} />
        <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>
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
          style={[
            styles.mealBlock,
            !isLast && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.mealHeaderRow}>
            <Text style={styles.mealIcon}>{MEAL_ICONS[mealType]}</Text>
            <Text style={[styles.mealLabel, { color: colors.foreground }]}>
              {MEAL_LABELS[mealType]}
            </Text>
            <View style={styles.flexSpacer} />
            <Text
              style={[
                styles.toggleHint,
                { color: meal.enabled ? "#059669" : colors.mutedForeground },
              ]}
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
              style={[
                styles.menuInput,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder="Menu (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={meal.menu}
              onChangeText={(value) =>
                onTextFieldChange(mealType, "menu", value)
              }
              editable={!isPast}
              maxLength={80}
            />
          )}

          <View style={styles.windowRow}>
            <Feather
              name="clock"
              size={12}
              color={colors.mutedForeground}
              style={styles.windowClock}
            />
            <Text
              style={[styles.windowHint, { color: colors.mutedForeground }]}
            >
              On/off window
            </Text>
            <View style={styles.windowInputs}>
              <TouchableOpacity
                style={[
                  styles.timeInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                onPress={() =>
                  onOpenTimePicker(meal.start, (value) =>
                    onTextFieldChange(mealType, "start", value),
                  )
                }
                disabled={isPast}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeValue,
                    {
                      color: meal.start
                        ? colors.foreground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {formatTime12Hour(meal.start || "07:00")}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.timeSep, { color: colors.mutedForeground }]}>
                –
              </Text>
              <TouchableOpacity
                style={[
                  styles.timeInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                onPress={() =>
                  onOpenTimePicker(meal.end, (value) =>
                    onTextFieldChange(mealType, "end", value),
                  )
                }
                disabled={isPast}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.timeValue,
                    {
                      color: meal.end
                        ? colors.foreground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {formatTime12Hour(meal.end || "09:30")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    })}

    <View
      style={[
        styles.noticeBanner,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Feather name="info" size={12} color={colors.mutedForeground} />
      <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
        Changes save automatically. Today&apos;s meal and window changes apply
        to future dates; future-date changes apply only to that date.
      </Text>
    </View>

    {!isPast && (
      <View style={styles.autoSaveRow}>
        {saving ? (
          <ActivityIndicator size={13} color={colors.primary} />
        ) : (
          <Feather name="check-circle" size={14} color="#059669" />
        )}
        <Text
          style={[
            styles.autoSaveText,
            { color: saving ? colors.primary : colors.mutedForeground },
          ]}
        >
          {saving ? "Saving changes..." : "Changes save automatically"}
        </Text>
      </View>
    )}
  </View>
);
