import Feather from "@expo/vector-icons/Feather";
import { ApiError } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  DEFAULT_MEAL_DRAFT,
  MEAL_LABELS,
  MEAL_TYPES,
} from "@/constants/mealStatus";
import { useAppDispatch, useAuth } from "@/redux/hooks";
import { setSchedule } from "@/redux/slice/mealMenuSlice";
import {
  getMealStatus,
  updateMealSchedule,
  queueMealScheduleUpdate,
} from "@/services/mealStatusService";
import { useOfflineDatabase } from "@/offline/provider/OfflineDatabaseProvider";
import { getDashboardSchedule } from "@/services/dashboardService";
import type {
  MealDraft,
  MealType,
  MealScheduleUpdate,
} from "@/types/mealStatus";
import { getTodayDate, isValidTime } from "@/utils/mealStatus";
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

const serializeMeal = (meal: MealDraft[MealType]): string =>
  JSON.stringify({
    enabled: meal.enabled,
    menu: meal.menu.trim(),
    start: meal.start.trim(),
    end: meal.end.trim(),
  });

const parseMealSnapshot = (snapshot: string): MealDraft[MealType] =>
  JSON.parse(snapshot) as MealDraft[MealType];

const NOT_SAVING: Record<MealType, boolean> = {
  breakfast: false,
  lunch: false,
  dinner: false,
};

const createSavedMealSnapshots = (
  schedule: MealStatusSchedule | null,
): Record<MealType, string> => {
  const draft = createDraftFromSchedule(schedule);
  return Object.fromEntries(
    MEAL_TYPES.map((mealType) => [mealType, serializeMeal(draft[mealType])]),
  ) as Record<MealType, string>;
};

export const ScheduleEditor = ({
  schedule,
  selectedDate,
  loadedDate,
}: ScheduleEditorProps) => {
  const dispatch = useAppDispatch();
  const { mess, token, user } = useAuth();
  const { database } = useOfflineDatabase();
  const [draft, setDraft] = useState(() => createDraftFromSchedule(schedule));
  // Per meal, so saving one meal neither spins nor blocks another's button.
  const [savingMeals, setSavingMeals] = useState(NOT_SAVING);
  const [savedMealSnapshots, setSavedMealSnapshots] = useState(() =>
    createSavedMealSnapshots(schedule),
  );
  const savedRef = useRef(savedMealSnapshots);
  savedRef.current = savedMealSnapshots;
  const savingRef = useRef(savingMeals);
  savingRef.current = savingMeals;
  const draftDateRef = useRef(selectedDate);
  const setMealSaving = (mealType: MealType, value: boolean) =>
    setSavingMeals((current) => ({ ...current, [mealType]: value }));
  const today = getTodayDate();
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
    setDraft((current) => ({
      ...current,
      [mealType]: { ...current[mealType], enabled },
    }));
  };

  // A schedule reload (pull-to-refresh, or the socket event every save
  // triggers) must not wipe a meal the admin is still editing. Same date: only
  // meals with no unsaved edit and no save in flight take the server's values.
  // A different date starts over.
  useEffect(() => {
    const nextDraft = createDraftFromSchedule(schedule);
    const nextSaved = createSavedMealSnapshots(schedule);
    if (draftDateRef.current !== selectedDate) {
      draftDateRef.current = selectedDate;
      setDraft(nextDraft);
      setSavedMealSnapshots(nextSaved);
      return;
    }
    const previousSaved = savedRef.current;
    const saving = savingRef.current;
    setDraft((current) => {
      const merged = { ...current };
      for (const mealType of MEAL_TYPES) {
        const editing =
          saving[mealType] ||
          serializeMeal(current[mealType]) !== previousSaved[mealType];
        if (!editing) merged[mealType] = nextDraft[mealType];
      }
      return merged;
    });
    setSavedMealSnapshots(nextSaved);
  }, [schedule, selectedDate]);

  const handleSave = async (mealType: MealType) => {
    if (!token || !mess?.id || isPast || loadedDate !== selectedDate) return;
    if (savingMeals[mealType]) return;

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
    if (Boolean(meal.start) !== Boolean(meal.end)) {
      Alert.alert(
        "Incomplete Window",
        `${MEAL_LABELS[mealType]} requires both a start and end time.`,
      );
      return;
    }

    setMealSaving(mealType, true);
    try {
      const update: MealScheduleUpdate = {
        messId: mess.id,
        date: selectedDate,
      };
      const savedMeal = JSON.parse(savedMealSnapshots[mealType]) as {
        enabled: boolean;
        menu: string;
        start: string;
        end: string;
      };
      const mealValues = {
        enabled: meal.enabled,
        start: meal.start.trim() || null,
        end: meal.end.trim() || null,
      };
      const controlsChanged =
        mealValues.enabled !== savedMeal.enabled ||
        (mealValues.start ?? "") !== savedMeal.start ||
        (mealValues.end ?? "") !== savedMeal.end;
      if (controlsChanged) {
        if (mealType === "breakfast") {
          update.breakfastEnabled = mealValues.enabled;
          update.breakfastOptOutStart = mealValues.start;
          update.breakfastOptOutEnd = mealValues.end;
        } else if (mealType === "lunch") {
          update.lunchEnabled = mealValues.enabled;
          update.lunchOptOutStart = mealValues.start;
          update.lunchOptOutEnd = mealValues.end;
        } else {
          update.dinnerEnabled = mealValues.enabled;
          update.dinnerOptOutStart = mealValues.start;
          update.dinnerOptOutEnd = mealValues.end;
        }
      }

      const nextMenu = meal.menu.trim();
      if (nextMenu !== savedMeal.menu) {
        if (mealType === "breakfast") update.breakfastMenu = nextMenu || null;
        else if (mealType === "lunch") update.lunchMenu = nextMenu || null;
        else update.dinnerMenu = nextMenu || null;
      }

      // The offline copy may only carry this meal's edit. The other meals
      // keep their saved values, not whatever unsaved draft they hold.
      const effective = (type: MealType) =>
        type === mealType ? meal : parseMealSnapshot(savedMealSnapshots[type]);
      const breakfast = effective("breakfast");
      const lunch = effective("lunch");
      const dinner = effective("dinner");
      const nextSchedule = {
        breakfastEnabled: breakfast.enabled,
        breakfastMenu: breakfast.menu.trim() || null,
        breakfastOptOutStart: breakfast.start.trim() || null,
        breakfastOptOutEnd: breakfast.end.trim() || null,
        lunchEnabled: lunch.enabled,
        lunchMenu: lunch.menu.trim() || null,
        lunchOptOutStart: lunch.start.trim() || null,
        lunchOptOutEnd: lunch.end.trim() || null,
        dinnerEnabled: dinner.enabled,
        dinnerMenu: dinner.menu.trim() || null,
        dinnerOptOutStart: dinner.start.trim() || null,
        dinnerOptOutEnd: dinner.end.trim() || null,
      };
      try {
        await updateMealSchedule(update, token);
      } catch (remoteError) {
        if (remoteError instanceof ApiError && remoteError.status !== 408)
          throw remoteError;
        const queued = await queueMealScheduleUpdate(
          database,
          user?.id ?? null,
          update,
          nextSchedule,
        ).catch(() => false);
        if (!queued) throw remoteError;
        setSavedMealSnapshots((current) => ({
          ...current,
          [mealType]: serializeMeal(meal),
        }));
        Alert.alert("Saved offline", "Schedule will sync when you are online.");
        return;
      }
      const updatedDashboardSchedule = await getDashboardSchedule(
        mess.id,
        token,
        selectedDate,
      );
      dispatch(setSchedule(updatedDashboardSchedule));
      setSavedMealSnapshots((current) => ({
        ...current,
        [mealType]: serializeMeal(meal),
      }));
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save",
      );
    } finally {
      setMealSaving(mealType, false);
    }
  };

  return (
    <View className="mx-4 mb-5">
      <View className="mb-2.5 flex-row items-center justify-between px-1">
        <Text className="font-inter-bold text-[13px] tracking-[1.2px] text-slate-500">
          SCHEDULE
        </Text>
        {isPast && (
          <View className="flex-row items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1">
            <Feather name="lock" size={11} color="#475569" />
            <Text className="font-inter-medium text-[11px] text-slate-600">
              Read only
            </Text>
          </View>
        )}
      </View>

      <View className="overflow-hidden rounded-[20px] border border-slate-300 bg-[#E6E9EE] px-4 shadow-sm shadow-slate-900/5">
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
            onSave={() => void handleSave(mealType)}
            saving={savingMeals[mealType]}
            dirty={
              serializeMeal(draft[mealType]) !== savedMealSnapshots[mealType]
            }
          />
        ))}
      </View>
    </View>
  );
};
