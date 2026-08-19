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
} from "@/constants/dashboard";
import type { DashboardMealType, TodaySchedule } from "@/types/dashboard";
import {
  getDashboardMealEnabled,
  getDashboardMealMenu,
} from "@/utils/dashboard";

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

interface DashboardMealCardProps {
  mealType: DashboardMealType;
  schedule: TodaySchedule | null;
  optedOut: boolean;
  pending: boolean;
  canInteract: boolean;
  onPress: (mealType: DashboardMealType) => void;
}

export const DashboardMealCard = ({
  mealType,
  schedule,
  optedOut,
  pending,
  canInteract,
  onPress,
}: DashboardMealCardProps) => {
  const enabled = getDashboardMealEnabled(schedule, mealType);
  const menu = getDashboardMealMenu(schedule, mealType);
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
        className={`text-center font-inter-bold text-[15px] ${visual.labelClassName}`}
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
          className={`rounded-full bg-white/55 px-2 py-0.5 font-inter-semibold text-[8px] ${visual.statusClassName}`}
        >
          {visual.status}
        </Text>
      )}
    </TouchableOpacity>
  );
};
