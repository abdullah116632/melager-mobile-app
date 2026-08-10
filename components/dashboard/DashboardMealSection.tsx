import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DASHBOARD_MEAL_ICONS,
  DASHBOARD_MEAL_LABELS,
  DASHBOARD_MEAL_TYPES,
} from "@/constants/dashboard";
import type { DashboardMealType, TodaySchedule } from "@/types/dashboard";
import {
  formatDashboardDateLabel,
  formatDashboardFullDate,
} from "@/utils/dashboard";

const getMealEnabled = (
  schedule: TodaySchedule | null,
  mealType: DashboardMealType,
) => schedule?.schedule[`${mealType}Enabled`] ?? true;

const getMealMenu = (
  schedule: TodaySchedule | null,
  mealType: DashboardMealType,
) => schedule?.schedule[`${mealType}Menu`] ?? null;

const MenuMarquee = ({
  menu,
  textClassName,
}: {
  menu: string;
  textClassName: string;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const gap = 28;
  const marqueeWidth = Math.max(180, menu.length * 12 + 32);

  useEffect(() => {
    translateX.setValue(0);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -(marqueeWidth + gap),
        duration: Math.max(4000, (marqueeWidth + gap) * 28),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [gap, marqueeWidth, translateX]);

  return (
    <View className="h-[14px] w-full justify-center overflow-hidden">
      <Animated.View
        className="flex-row items-center"
        style={{ transform: [{ translateX }] }}
      >
        {[0, 1].map((copyIndex) => (
          <Text
            key={copyIndex}
            className={`shrink-0 font-inter text-[10px] leading-[14px] opacity-80 ${textClassName}`}
            style={{
              width: marqueeWidth,
              marginLeft: copyIndex === 1 ? gap : 0,
            }}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {menu}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
};

interface MealBoxProps {
  mealType: DashboardMealType;
  schedule: TodaySchedule | null;
  optedOut: boolean;
  pending: boolean;
  canInteract: boolean;
  onPress: (mealType: DashboardMealType) => void;
}

const MealBox = ({
  mealType,
  schedule,
  optedOut,
  pending,
  canInteract,
  onPress,
}: MealBoxProps) => {
  const enabled = getMealEnabled(schedule, mealType);
  const menu = getMealMenu(schedule, mealType);
  const visual = !enabled
    ? {
        containerClassName: "border-gray-200 bg-gray-100",
        labelClassName: "text-gray-400",
        statusClassName: "text-gray-400",
        status: "Disabled",
        statusColor: "#9CA3AF",
      }
    : optedOut
      ? {
          containerClassName: "border-red-200 bg-red-50",
          labelClassName: "text-red-600",
          statusClassName: "text-red-600",
          status: "Turned Off",
          statusColor: "#DC2626",
        }
      : {
          containerClassName: "border-emerald-300 bg-teal-50",
          labelClassName: "text-emerald-800",
          statusClassName: "text-emerald-600",
          status: "Active",
          statusColor: "#059669",
        };
  const isTappable = enabled && canInteract && !pending;

  return (
    <TouchableOpacity
      className={`min-h-[98px] flex-1 items-center justify-center gap-[3px] rounded-[16px] border-[1.5px] px-1.5 py-2 ${visual.containerClassName} ${canInteract ? "opacity-100" : "opacity-70"}`}
      onPress={() => isTappable && onPress(mealType)}
      activeOpacity={isTappable ? 0.75 : 1}
      disabled={!isTappable}
    >
      <Text className="text-[23px]">{DASHBOARD_MEAL_ICONS[mealType]}</Text>
      <Text
        className={`text-center font-inter-bold text-[12px] ${visual.labelClassName}`}
      >
        {DASHBOARD_MEAL_LABELS[mealType]}
      </Text>
      {menu ? (
        <MenuMarquee menu={menu} textClassName={visual.labelClassName} />
      ) : null}
      {pending ? (
        <ActivityIndicator
          size="small"
          color={visual.statusColor}
          className="mt-1"
        />
      ) : (
        <Text
          className={`rounded-full bg-white/55 px-2.5 py-0.5 font-inter-semibold text-[10px] ${visual.statusClassName}`}
        >
          {visual.status}
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface DashboardMealSectionProps {
  selectedDate: string;
  today: string;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  isAtFutureLimit: boolean;
  isAdmin: boolean;
  schedule: TodaySchedule | null;
  optOuts: Set<string>;
  pendingOptOuts: Set<string>;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onManage: () => void;
  onToggleMeal: (mealType: DashboardMealType) => void;
}

export const DashboardMealSection = ({
  selectedDate,
  today,
  isPast,
  isToday,
  isFuture,
  isAtFutureLimit,
  isAdmin,
  schedule,
  optOuts,
  pendingOptOuts,
  onPrevious,
  onNext,
  onToday,
  onManage,
  onToggleMeal,
}: DashboardMealSectionProps) => (
  <View className="mx-4 mb-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-lg shadow-slate-300/30">
    <View className="flex-row items-center px-3 pb-2 pt-3">
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white shadow-md shadow-slate-300/40"
        onPress={onPrevious}
        activeOpacity={0.7}
      >
        <Feather name="chevron-left" size={20} color="#0F172A" />
      </TouchableOpacity>
      <TouchableOpacity
        className="flex-1 items-center px-2"
        onPress={isToday ? undefined : onToday}
        activeOpacity={isToday ? 1 : 0.7}
      >
        <Text className="text-center font-inter-bold text-base text-slate-900">
          {formatDashboardDateLabel(selectedDate, today)}
        </Text>
        {!isToday && (
          <Text className="mt-0.5 text-center font-inter text-[10px] text-teal-700">
            {formatDashboardFullDate(selectedDate)} · Tap for Today
          </Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        className={`h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white shadow-md shadow-slate-300/40 ${isAtFutureLimit ? "opacity-35" : "opacity-100"}`}
        onPress={onNext}
        activeOpacity={0.7}
        disabled={isAtFutureLimit}
      >
        <Feather name="chevron-right" size={20} color="#0F172A" />
      </TouchableOpacity>
    </View>

    {isPast && (
      <View className="flex-row items-center gap-1.5 border-b-[0.5px] border-amber-200 bg-amber-100 px-3.5 py-[7px]">
        <Feather name="lock" size={12} color="#92400E" />
        <Text className="font-inter-medium text-xs text-amber-800">
          Past date — view only, meal on/off locked
        </Text>
      </View>
    )}
    {isFuture && (
      <View className="flex-row items-center gap-1.5 border-b-[0.5px] border-blue-200 bg-blue-50 px-3.5 py-[7px]">
        <Feather name="calendar" size={12} color="#1E40AF" />
        <Text className="font-inter-medium text-xs text-blue-800">
          Future date — meal on/off allowed
        </Text>
      </View>
    )}

    {isAdmin && (
      <View className="flex-row items-center border-t border-slate-100 px-3.5 pb-2.5 pt-2.5">
        {schedule ? (
          <View className="flex-row items-center gap-2">
            {DASHBOARD_MEAL_TYPES.map((mealType) => {
              const enabled = getMealEnabled(schedule, mealType);
              return (
                <View
                  key={mealType}
                  className="flex-row items-center gap-[3px] rounded-full bg-teal-50 px-2 py-1"
                >
                  <Text className="text-[13px]">
                    {DASHBOARD_MEAL_ICONS[mealType]}
                  </Text>
                  <Text
                    className={`font-inter-bold text-[13px] ${enabled ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {enabled ? schedule.activeByMeal[mealType] : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
        <View className="flex-1" />
        <TouchableOpacity
          className="flex-row items-center gap-1 rounded-full border border-teal-100 bg-white px-3 py-2 shadow-sm shadow-slate-300/30"
          onPress={onManage}
          activeOpacity={0.75}
        >
          <Feather name="settings" size={13} color="#0F766E" />
          <Text className="font-inter-semibold text-xs text-teal-700">
            Manage
          </Text>
        </TouchableOpacity>
      </View>
    )}

    <View className="flex-row gap-2.5 px-3.5 pb-4">
      {DASHBOARD_MEAL_TYPES.map((mealType) => (
        <MealBox
          key={mealType}
          mealType={mealType}
          schedule={schedule}
          optedOut={optOuts.has(mealType)}
          pending={pendingOptOuts.has(mealType)}
          canInteract={!isPast}
          onPress={onToggleMeal}
        />
      ))}
    </View>
    {!isAdmin && !isPast && (
      <Text className="pb-2.5 text-center font-inter text-[11px] text-slate-500">
        Tap a meal to turn it on or off
      </Text>
    )}
  </View>
);
