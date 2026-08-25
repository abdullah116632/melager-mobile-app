import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import {
  DEFAULT_MEAL_DRAFT,
  MEAL_LABELS,
  MEAL_STATUS_AUTOSAVE_DELAY,
  MEAL_TYPES,
} from "@/constants/mealStatus";
import { useAuth } from "@/redux/hooks";
import {
  getMealStatus,
  updateMealSchedule,
} from "@/services/mealStatusService";
import type {
  ControlScope,
  MealDraft,
  MealType,
  PendingMealControls,
} from "@/types/mealStatus";
import {
  getTodayDate,
  isValidTime,
  serializeMealDraft,
} from "@/utils/mealStatus";
import {
  MealScheduleItem,
  type MealScheduleTextField,
} from "./MealScheduleItem";

type MealStatusSchedule = Awaited<ReturnType<typeof getMealStatus>>["schedule"];

interface ScheduleEditorProps {
  schedule: MealStatusSchedule | null;
  selectedDate: string;
  loadedDate: string | null;
}

const createDraftFromSchedule = (
  schedule: MealStatusSchedule | null,
): MealDraft =>
  schedule
    ? {
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
      }
    : DEFAULT_MEAL_DRAFT;

export const ScheduleEditor = ({
  schedule,
  selectedDate,
  loadedDate,
}: ScheduleEditorProps) => {
  const { mess, token } = useAuth();
  const [draft, setDraft] = useState(() => createDraftFromSchedule(schedule));
  const [saving, setSaving] = useState(false);
  const [pendingControls, setPendingControls] = useState<PendingMealControls>(
    {},
  );
  const lastSavedSnapshotRef = useRef(serializeMealDraft(draft));
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = getTodayDate();
  const isToday = selectedDate === today;
  const isPast = selectedDate < today;

  const updateDraftField = (
    mealType: MealType,
    field: MealScheduleTextField,
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      [mealType]: { ...current[mealType], [field]: value },
    }));
  };

  const handleEnabledChange = (mealType: MealType, enabled: boolean) => {
    if (isPast) return;
    const scope: ControlScope = isToday ? "ongoing" : "day";
    setDraft((current) => ({
      ...current,
      [mealType]: { ...current[mealType], enabled },
    }));
    setPendingControls((current) => ({
      ...current,
      [mealType]: { enabled, scope },
    }));
  };

  const handleSave = async () => {
    if (!token || !mess?.id || isPast || loadedDate !== selectedDate) return;

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
      saving ||
      isPast ||
      !token ||
      !mess?.id ||
      loadedDate !== selectedDate
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
    saving,
    isPast,
    selectedDate,
    loadedDate,
    token,
    mess?.id,
  ]);

  return (
    <>
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

        {MEAL_TYPES.map((mealType, index) => (
          <MealScheduleItem
            key={mealType}
            mealType={mealType}
            meal={draft[mealType]}
            isLast={index === MEAL_TYPES.length - 1}
            isPast={isPast}
            onEnabledChange={(enabled) =>
              handleEnabledChange(mealType, enabled)
            }
            onFieldChange={(field, value) =>
              updateDraftField(mealType, field, value)
            }
          />
        ))}

        <View className="mb-3.5 mt-3.5 flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <Feather name="info" size={12} color="#64748B" />
          <Text className="flex-1 font-inter text-[11px] text-slate-500">
            Changes save automatically. Today&apos;s meal and window changes
            apply to future dates; future-date changes apply only to that date.
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
    </>
  );
};
