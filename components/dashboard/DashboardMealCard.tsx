import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { DASHBOARD_MEAL_LABELS } from "@/constants/dashboard";
import type { DashboardMealType, TodaySchedule } from "@/types/dashboard";
import {
  getDashboardMealEnabled,
  getDashboardMealMenu,
} from "@/utils/dashboard";

const MARQUEE_GAP = 28;

const MenuMarquee = ({ text }: { text: string }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const shouldWrap = text.length > 42;
  const shouldScroll = !shouldWrap && containerWidth > 0 && textWidth > containerWidth + 2;

  useEffect(() => {
    translateX.stopAnimation();
    translateX.setValue(0);
    if (!shouldScroll) return;

    const distance = textWidth + MARQUEE_GAP;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(translateX, {
          toValue: -distance,
          duration: Math.max(3500, distance * 35),
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.delay(350),
      ]),
      { resetBeforeIteration: true },
    );
    animation.start();
    return () => animation.stop();
  }, [shouldScroll, textWidth, translateX]);

  return (
    <View
      className={`${shouldWrap ? "min-h-[32px]" : "h-[17px]"} w-full justify-center overflow-hidden`}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <Text
        className="absolute font-inter text-[12px] text-slate-500"
        numberOfLines={1}
        style={{ width: 10_000, opacity: 0 }}
        onTextLayout={(event) =>
          setTextWidth(event.nativeEvent.lines[0]?.width ?? 0)
        }
      >
        {text}
      </Text>
      {shouldWrap ? (
        <Text
          className="font-inter text-[12px] leading-4 text-slate-500"
          numberOfLines={2}
        >
          {text}
        </Text>
      ) : shouldScroll ? (
        <Animated.View
          className="flex-row items-center"
          style={{ transform: [{ translateX }] }}
        >
          {[0, 1].map((copy) => (
            <Text
              key={copy}
              className="shrink-0 font-inter text-[12px] text-slate-500"
              numberOfLines={1}
              style={{ marginLeft: copy === 1 ? MARQUEE_GAP : 0 }}
            >
              {text}
            </Text>
          ))}
        </Animated.View>
      ) : (
        <Text
          className="font-inter text-[12px] text-slate-500"
          numberOfLines={1}
        >
          {text}
        </Text>
      )}
    </View>
  );
};

interface DashboardMealCardProps {
  mealType: DashboardMealType;
  schedule: TodaySchedule | null;
  activeCount: number;
  optedOut: boolean;
  pending: boolean;
  canInteract: boolean;
  isLast: boolean;
  onPress: (mealType: DashboardMealType) => void;
}

export const DashboardMealCard = ({
  mealType,
  schedule,
  activeCount,
  optedOut,
  pending,
  canInteract,
  isLast,
  onPress,
}: DashboardMealCardProps) => {
  const enabled = getDashboardMealEnabled(schedule, mealType);
  const menu = getDashboardMealMenu(schedule, mealType);
  const isOn = enabled && !optedOut;
  const status = enabled ? "Active" : "Disabled";
  const statusColor = enabled ? "text-emerald-600" : "text-slate-400";

  return (
    <View
      className={`min-h-[82px] flex-row items-center px-4 py-3 ${isLast ? "" : "border-b border-slate-100"}`}
    >
      <View className="w-[52px] items-center">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-teal-50">
          {mealType === "lunch" ? (
            <View className="h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-teal-600">
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={19}
                color="#0F8A80"
              />
            </View>
          ) : (
            <Ionicons
              name={mealType === "breakfast" ? "sunny-outline" : "moon-outline"}
              size={23}
              color="#0F8A80"
            />
          )}
        </View>
        <Text
          className={`mt-0.5 font-inter-semibold text-[8px] leading-[10px] ${statusColor}`}
          numberOfLines={1}
        >
          {status}
        </Text>
      </View>

      <View
        className="ml-3 min-w-0 flex-1 pr-2"
        style={{ opacity: enabled ? 1 : 0.42 }}
      >
        <Text
          className="font-inter-bold text-[15px] text-slate-900"
          numberOfLines={1}
        >
          {DASHBOARD_MEAL_LABELS[mealType]}
        </Text>
        <MenuMarquee text={menu || "No menu set"} />
      </View>

      <View className="ml-1 w-[74px] items-center">
        <Pressable
          className="h-8 w-[38px] items-center justify-center"
          onPress={() => onPress(mealType)}
          disabled={pending || !canInteract}
          hitSlop={4}
          style={({ pressed }) => ({
            opacity: pressed ? 0.65 : canInteract ? 1 : 0.55,
          })}
          accessibilityRole="switch"
          accessibilityState={{ checked: isOn, disabled: !canInteract }}
          accessibilityLabel={`${DASHBOARD_MEAL_LABELS[mealType]} is ${status}${optedOut ? ", you are off" : ""}`}
        >
          {pending ? (
            <ActivityIndicator size="small" color="#0F766E" />
          ) : (
            <View
              pointerEvents="none"
              className={`h-[18px] w-[32px] justify-center rounded-full p-[2px] ${isOn ? "bg-teal-200" : "bg-slate-300"}`}
              style={{ alignItems: isOn ? "flex-end" : "flex-start" }}
            >
              <View
                className={`h-[14px] w-[14px] rounded-full ${isOn ? "bg-teal-600" : "bg-slate-500"}`}
                style={{
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.18,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              />
            </View>
          )}
        </Pressable>

        <Text
          className="font-inter-bold text-[12px] leading-[14px] text-teal-700"
          style={{ opacity: enabled ? 1 : 0.42 }}
          numberOfLines={1}
        >
          {activeCount}
        </Text>
        <Text
          className="font-inter-semibold text-[9px] leading-[12px] text-teal-700"
          style={{ opacity: enabled ? 1 : 0.42 }}
          numberOfLines={1}
        >
          Active meals
        </Text>
        {enabled && optedOut ? (
          <Text
            className="mt-0.5 font-inter-bold text-[8px] leading-[10px] text-red-600"
            numberOfLines={1}
          >
            You&apos;re off
          </Text>
        ) : null}
      </View>
    </View>
  );
};
