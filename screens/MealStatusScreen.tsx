import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MealOptOutTable } from "@/components/meal-status/MealOptOutTable";
import { MealStatusHeader } from "@/components/meal-status/MealStatusHeader";
import { mealStatusStyles as styles } from "@/components/meal-status/mealStatusStyles";
import { ScheduleEditor } from "@/components/meal-status/ScheduleEditor";
import { TimePickerModal } from "@/components/meal-status/TimePickerModal";
import {
  DEFAULT_MEAL_DRAFT,
  MEAL_LABELS,
  MEAL_STATUS_AUTOSAVE_DELAY,
  MEAL_STATUS_MAX_FUTURE_DAYS,
  MEAL_TYPES,
} from "@/constants/mealStatus";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  getMealStatus,
  updateMealSchedule,
} from "@/services/mealStatusService";
import type {
  ControlScope,
  MealDraft,
  MealStatusConsumer,
  MealType,
  PendingMealControls,
} from "@/types/mealStatus";
import {
  addDays,
  getTodayDate,
  isValidTime,
  serializeMealDraft,
} from "@/utils/mealStatus";

interface MealStatusScreenProps {
  initialDate?: string;
  onBack: () => void;
}

type TimePickerState = {
  value: string;
  onChange: (value: string) => void;
};

const createDraftFromSchedule = (
  schedule: Awaited<ReturnType<typeof getMealStatus>>["schedule"],
): MealDraft => ({
  breakfast: {
    enabled: schedule.breakfastEnabled,
    menu: schedule.breakfastMenu ?? "",
    start: schedule.breakfastOptOutStart ?? "",
    end: schedule.breakfastOptOutEnd ?? "",
  },
  lunch: {
    enabled: schedule.lunchEnabled,
    menu: schedule.lunchMenu ?? "",
    start: schedule.lunchOptOutStart ?? "",
    end: schedule.lunchOptOutEnd ?? "",
  },
  dinner: {
    enabled: schedule.dinnerEnabled,
    menu: schedule.dinnerMenu ?? "",
    start: schedule.dinnerOptOutStart ?? "",
    end: schedule.dinnerOptOutEnd ?? "",
  },
});

export const MealStatusScreen = ({
  initialDate,
  onBack,
}: MealStatusScreenProps) => {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { mess, token } = useAuth();
  const today = getTodayDate();
  const maxFutureDate = addDays(today, MEAL_STATUS_MAX_FUTURE_DAYS);
  const [selectedDate, setSelectedDate] = useState(() =>
    initialDate && initialDate > maxFutureDate
      ? maxFutureDate
      : (initialDate ?? today),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consumers, setConsumers] = useState<MealStatusConsumer[]>([]);
  const [draft, setDraft] = useState<MealDraft>(DEFAULT_MEAL_DRAFT);
  const [timePicker, setTimePicker] = useState<TimePickerState | null>(null);
  const [pendingControls, setPendingControls] = useState<PendingMealControls>(
    {},
  );
  const loadedDateRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef("");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isToday = selectedDate === today;
  const isPast = selectedDate < today;
  const isAtFutureLimit = selectedDate >= maxFutureDate;

  const load = useCallback(
    async (date: string) => {
      if (!token || !mess?.id) return;
      loadedDateRef.current = null;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      setLoading(true);

      try {
        const data = await getMealStatus(mess.id, date, token);
        const nextDraft = createDraftFromSchedule(data.schedule);
        setConsumers(data.consumers);
        setDraft(nextDraft);
        setPendingControls({});
        lastSavedSnapshotRef.current = serializeMealDraft(nextDraft);
        loadedDateRef.current = date;
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to load",
        );
      } finally {
        setLoading(false);
      }
    },
    [mess?.id, token],
  );

  useEffect(() => {
    loadedDateRef.current = null;
    void load(selectedDate);
  }, [load, selectedDate]);

  const updateDraftField = (
    mealType: MealType,
    field: "menu" | "start" | "end",
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      [mealType]: { ...current[mealType], [field]: value },
    }));
  };

  const applyEnabledChange = (
    mealType: MealType,
    enabled: boolean,
    scope: ControlScope,
  ) => {
    setDraft((current) => ({
      ...current,
      [mealType]: { ...current[mealType], enabled },
    }));
    setPendingControls((current) => ({
      ...current,
      [mealType]: { enabled, scope },
    }));
  };

  const handleEnabledChange = (mealType: MealType, enabled: boolean) => {
    if (isPast) return;
    applyEnabledChange(mealType, enabled, isToday ? "ongoing" : "day");
  };

  const handleSave = async () => {
    if (!token || !mess?.id || isPast || loadedDateRef.current !== selectedDate)
      return;

    const snapshotBeingSaved = serializeMealDraft(draft);
    const controlsBeingSaved = { ...pendingControls };

    for (const mealType of MEAL_TYPES) {
      const meal = draft[mealType];
      for (const [fieldLabel, value] of [
        ["start", meal.start],
        ["end", meal.end],
      ] as const) {
        if (value && !isValidTime(value)) {
          Alert.alert(
            "Invalid Time",
            `${MEAL_LABELS[mealType]} ${fieldLabel} must be HH:MM format (e.g. 07:00)`,
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      await updateMealSchedule(
        {
          messId: mess.id,
          date: selectedDate,
          breakfastEnabled: draft.breakfast.enabled,
          breakfastMenu: draft.breakfast.menu.trim() || null,
          breakfastOptOutStart: draft.breakfast.start.trim() || null,
          breakfastOptOutEnd: draft.breakfast.end.trim() || null,
          lunchEnabled: draft.lunch.enabled,
          lunchMenu: draft.lunch.menu.trim() || null,
          lunchOptOutStart: draft.lunch.start.trim() || null,
          lunchOptOutEnd: draft.lunch.end.trim() || null,
          dinnerEnabled: draft.dinner.enabled,
          dinnerMenu: draft.dinner.menu.trim() || null,
          dinnerOptOutStart: draft.dinner.start.trim() || null,
          dinnerOptOutEnd: draft.dinner.end.trim() || null,
          mealControls: Object.entries(controlsBeingSaved).map(
            ([mealType, control]) => ({
              mealType: mealType as MealType,
              ...control!,
            }),
          ),
        },
        token,
      );
      lastSavedSnapshotRef.current = snapshotBeingSaved;
      setPendingControls((current) => {
        const next = { ...current };
        for (const [mealType, savedControl] of Object.entries(
          controlsBeingSaved,
        ) as Array<[MealType, { enabled: boolean; scope: ControlScope }]>) {
          const currentControl = next[mealType];
          if (
            currentControl?.enabled === savedControl.enabled &&
            currentControl.scope === savedControl.scope
          ) {
            delete next[mealType];
          }
        }
        return next;
      });
    } catch (error) {
      lastSavedSnapshotRef.current = snapshotBeingSaved;
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (
      loading ||
      saving ||
      isPast ||
      !token ||
      !mess?.id ||
      loadedDateRef.current !== selectedDate
    ) {
      return;
    }

    if (serializeMealDraft(draft) === lastSavedSnapshotRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void handleSave();
    }, MEAL_STATUS_AUTOSAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    draft,
    pendingControls,
    loading,
    saving,
    isPast,
    selectedDate,
    token,
    mess?.id,
  ]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: topPadding },
      ]}
    >
      <MealStatusHeader
        colors={colors}
        selectedDate={selectedDate}
        today={today}
        isAtFutureLimit={isAtFutureLimit}
        onBack={onBack}
        onPreviousDate={() => setSelectedDate((date) => addDays(date, -1))}
        onNextDate={() =>
          setSelectedDate((date) =>
            date >= maxFutureDate ? date : addDays(date, 1),
          )
        }
        onToday={() => setSelectedDate(today)}
        onRefresh={() => void load(selectedDate)}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          <ScheduleEditor
            colors={colors}
            draft={draft}
            isPast={isPast}
            saving={saving}
            onEnabledChange={handleEnabledChange}
            onTextFieldChange={updateDraftField}
            onOpenTimePicker={(value, onChange) =>
              setTimePicker({ value, onChange })
            }
          />
          <MealOptOutTable colors={colors} consumers={consumers} />
        </ScrollView>
      )}

      <TimePickerModal
        visible={Boolean(timePicker)}
        initialValue={timePicker?.value ?? ""}
        colors={colors}
        onClose={() => setTimePicker(null)}
        onSelect={(value) => {
          timePicker?.onChange(value);
          setTimePicker(null);
        }}
      />
    </View>
  );
};
