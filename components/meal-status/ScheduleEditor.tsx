import Feather from "@expo/vector-icons/Feather";
import { ApiError } from "@/lib/api";
import { useEffect, useState } from "react";
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
  ControlScope,
  MealDraft,
  MealType,
  PendingMealControls,
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
  const [saving, setSaving] = useState(false);
  const [pendingControls, setPendingControls] = useState<PendingMealControls>(
    {},
  );
  const [savedMealSnapshots, setSavedMealSnapshots] = useState(() =>
    createSavedMealSnapshots(schedule),
  );
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

  useEffect(() => {
    const nextDraft = createDraftFromSchedule(schedule);
    setDraft(nextDraft);
    setSavedMealSnapshots(createSavedMealSnapshots(schedule));
    setPendingControls({});
  }, [schedule, selectedDate]);

  const handleSave = async (mealType: MealType) => {
    if (!token || !mess?.id || isPast || loadedDate !== selectedDate) return;

    const meal = draft[mealType];
    const controlsBeingSaved = pendingControls[mealType]
      ? { [mealType]: pendingControls[mealType] }
      : {};

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

    setSaving(true);
    try {
      const getMeal = (type: MealType) =>
        type === mealType
          ? draft[type]
          : createDraftFromSchedule(schedule)[type];
      const update = {
          messId: mess.id,
          date: selectedDate,
          breakfastEnabled: getMeal("breakfast").enabled,
          breakfastMenu: getMeal("breakfast").menu.trim() || null,
          breakfastOptOutStart: getMeal("breakfast").start.trim() || null,
          breakfastOptOutEnd: getMeal("breakfast").end.trim() || null,
          lunchEnabled: getMeal("lunch").enabled,
          lunchMenu: getMeal("lunch").menu.trim() || null,
          lunchOptOutStart: getMeal("lunch").start.trim() || null,
          lunchOptOutEnd: getMeal("lunch").end.trim() || null,
          dinnerEnabled: getMeal("dinner").enabled,
          dinnerMenu: getMeal("dinner").menu.trim() || null,
          dinnerOptOutStart: getMeal("dinner").start.trim() || null,
          dinnerOptOutEnd: getMeal("dinner").end.trim() || null,
          mealControls: Object.entries(controlsBeingSaved).map(
            ([mealType, control]) => ({
              mealType: mealType as MealType,
              ...control!,
            }),
          ),
        };
      const nextSchedule = {
        breakfastEnabled: getMeal("breakfast").enabled,
        breakfastMenu: getMeal("breakfast").menu.trim() || null,
        breakfastOptOutStart: getMeal("breakfast").start.trim() || null,
        breakfastOptOutEnd: getMeal("breakfast").end.trim() || null,
        lunchEnabled: getMeal("lunch").enabled,
        lunchMenu: getMeal("lunch").menu.trim() || null,
        lunchOptOutStart: getMeal("lunch").start.trim() || null,
        lunchOptOutEnd: getMeal("lunch").end.trim() || null,
        dinnerEnabled: getMeal("dinner").enabled,
        dinnerMenu: getMeal("dinner").menu.trim() || null,
        dinnerOptOutStart: getMeal("dinner").start.trim() || null,
        dinnerOptOutEnd: getMeal("dinner").end.trim() || null,
      };
      try {
        await updateMealSchedule(update, token);
      } catch (remoteError) {
        if (remoteError instanceof ApiError) throw remoteError;
        const queued = await queueMealScheduleUpdate(database, user?.id ?? null, update, nextSchedule).catch(() => false);
        if (!queued) throw remoteError;
        dispatch(setSchedule({ date: selectedDate, schedule: nextSchedule, myOptOuts: [], totalConsumers: 0, activeByMeal: { breakfast: 0, lunch: 0, dinner: 0 }, totalActive: 0 }));
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
      setPendingControls((current) => {
        const next = { ...current };
        delete next[mealType];
        return next;
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <View className="mx-4 mb-3.5 rounded-2xl border border-slate-300 bg-[#E2E8F0] p-4">
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
            onMenuSave={() => void handleSave(mealType)}
            menuSaving={saving}
            menuSaveVisible={
              serializeMeal(draft[mealType]) !== savedMealSnapshots[mealType]
            }
          />
        ))}
      </View>
    </>
  );
};
