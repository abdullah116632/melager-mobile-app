import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, Text, TouchableOpacity, View } from "react-native";

import {
  useAppDispatch,
  useAppSelector,
  useAuth,
  useMess,
  useNetwork,
} from "@/redux/hooks";
import { loadBazar, selectBazarState } from "@/redux/slice/bazarSlice";
import { loadNotices, selectNoticesState } from "@/redux/slice/noticesSlice";
import {
  formatBazarDate,
  getBazarWeekday,
  getBazarWeekdayName,
} from "@/utils/bazar";
import { addDashboardDays, getDhakaDate } from "@/utils/dashboard";
import { SummaryCardShell } from "./DashboardSummaryParts";

const findNextBazarDay = (
  weekdays: Set<number>,
): { date: string; daysAway: number } | null => {
  if (weekdays.size === 0) return null;
  const today = getDhakaDate();
  for (let daysAway = 0; daysAway < 7; daysAway += 1) {
    const date = addDashboardDays(today, daysAway);
    if (weekdays.has(getBazarWeekday(date))) return { date, daysAway };
  }
  return null;
};

// Two loops: a halo that keeps rippling outward, and the cart rolling forward
// in short nudges with a pause, so it reads as "go" rather than as a shake.
const BazarTodayIcon = () => {
  const ripple = useRef(new Animated.Value(0)).current;
  const roll = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rippleLoop = Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    const nudge = (toValue: number) =>
      Animated.timing(roll, {
        toValue,
        duration: 140,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    const rollLoop = Animated.loop(
      Animated.sequence([
        nudge(1),
        nudge(-1),
        nudge(1),
        nudge(0),
        Animated.delay(1100),
      ]),
    );
    rippleLoop.start();
    rollLoop.start();
    return () => {
      rippleLoop.stop();
      rollLoop.stop();
    };
  }, [ripple, roll]);

  return (
    <View className="h-10 w-10 items-center justify-center">
      <Animated.View
        pointerEvents="none"
        className="absolute h-10 w-10 rounded-full bg-amber-400"
        style={{
          opacity: ripple.interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 0],
          }),
          transform: [
            {
              scale: ripple.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.7],
              }),
            },
          ],
        }}
      />
      <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-100">
        <Animated.View
          style={{
            transform: [
              {
                translateX: roll.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-1.5, 2],
                }),
              },
              {
                rotate: roll.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ["-10deg", "10deg"],
                }),
              },
            ],
          }}
        >
          <Feather name="shopping-cart" size={18} color="#B45309" />
        </Animated.View>
      </View>
    </View>
  );
};

const daysAwayLabel = (daysAway: number) =>
  daysAway === 0
    ? "Today"
    : daysAway === 1
      ? "Tomorrow"
      : `In ${daysAway} days`;

export const DashboardUpdatesCard = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, mess, role } = useAuth();
  const { consumers } = useMess();
  const { isOnline } = useNetwork();
  const { assignments } = useAppSelector(selectBazarState);
  const { notices } = useAppSelector(selectNoticesState);

  useEffect(() => {
    if (!mess?.id) return;
    // Both loaders show the saved SQLite copy first, then refresh when online.
    void dispatch(loadBazar({ includeConsumers: role === "admin" }))
      .unwrap()
      .catch(() => undefined);
    void dispatch(loadNotices({}))
      .unwrap()
      .catch(() => undefined);
  }, [dispatch, isOnline, mess?.id, role]);

  const myConsumerId = consumers.find(
    (consumer) => consumer.userId === user?.id,
  )?.id;
  const myWeekdays = new Set(
    assignments
      .filter((assignment) => String(assignment.consumerId) === myConsumerId)
      .map((assignment) => assignment.weekday),
  );
  const nextBazar = findNextBazarDay(myWeekdays);
  const firstNotice = [...notices].sort(
    (first, second) => first.serialNo - second.serialNo,
  )[0];

  const bazarToday = nextBazar?.daysAway === 0;

  return (
    <SummaryCardShell
      icon={<Feather name="bell" size={19} color="#0F766E" />}
      title="Updates"
      subtitle="Your bazar day & mess notice"
    >
      <View className="gap-3">
        {nextBazar ? (
          <TouchableOpacity
            className={`flex-row items-center gap-3 rounded-2xl border p-3 ${
              bazarToday
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-white"
            }`}
            onPress={() => router.push("/bazar-list?returnTo=dashboard")}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Open bazar list"
          >
            {bazarToday ? (
              <BazarTodayIcon />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50">
                <Feather name="shopping-cart" size={18} color="#0F766E" />
              </View>
            )}
            <View className="min-w-0 flex-1">
              <Text className="font-inter-medium text-[11px] text-slate-500">
                Your bazar day
              </Text>
              <Text
                className="font-inter-bold text-[14px] text-slate-900"
                numberOfLines={1}
              >
                {getBazarWeekdayName(nextBazar.date)},{" "}
                {formatBazarDate(nextBazar.date)}
              </Text>
            </View>
            <View
              className={`rounded-full px-2.5 py-1 ${
                bazarToday ? "bg-amber-500" : "bg-teal-50"
              }`}
            >
              <Text
                className={`font-inter-bold text-[11px] ${
                  bazarToday ? "text-white" : "text-teal-700"
                }`}
              >
                {daysAwayLabel(nextBazar.daysAway)}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="flex-row items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3"
            onPress={() => router.push("/bazar-list?returnTo=dashboard")}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Open bazar list"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-200">
              <Feather name="shopping-cart" size={18} color="#64748B" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-inter-bold text-[13.5px] text-slate-700">
                No bazar duty assigned
              </Text>
              <Text className="mt-0.5 font-inter text-[11.5px] leading-4 text-slate-500">
                {role === "admin"
                  ? "Pick a day of the week for your bazar duty from the Bazar List."
                  : "Ask your manager to assign you a day of the week for bazar duty."}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {firstNotice ? (
          <TouchableOpacity
            className="rounded-2xl border border-slate-200 p-3"
            style={{ backgroundColor: firstNotice.color || "#F0FDFA" }}
            onPress={() => router.push("/notice-board?returnTo=dashboard")}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Open notice board"
          >
            <View className="mb-1 flex-row items-center gap-1.5">
              <Feather name="clipboard" size={12} color="#475569" />
              <Text className="font-inter-semibold text-[11px] text-slate-600">
                Notice #{String(firstNotice.serialNo).padStart(2, "0")}
              </Text>
            </View>
            {firstNotice.title ? (
              <Text
                className="font-inter-bold text-[14px] text-slate-900"
                numberOfLines={1}
              >
                {firstNotice.title}
              </Text>
            ) : null}
            <Text
              className="mt-0.5 font-inter text-[12.5px] leading-[18px] text-slate-700"
              numberOfLines={3}
            >
              {firstNotice.body}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="flex-row items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3"
            onPress={() => router.push("/notice-board?returnTo=dashboard")}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Open notice board"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-200">
              <Feather name="clipboard" size={18} color="#64748B" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-inter-bold text-[13.5px] text-slate-700">
                {role === "admin"
                  ? "You haven't created any notice yet"
                  : "No notice has been created yet"}
              </Text>
              {role === "admin" ? (
                <Text className="mt-0.5 font-inter text-[11.5px] leading-4 text-slate-500">
                  To create one, open the Notice Board from the icon above.
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SummaryCardShell>
  );
};
