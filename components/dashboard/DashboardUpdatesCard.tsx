import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, TouchableOpacity, View } from "react-native";

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

  if (!nextBazar && !firstNotice) return null;

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
            <View
              className={`h-10 w-10 items-center justify-center rounded-full ${
                bazarToday ? "bg-amber-100" : "bg-teal-50"
              }`}
            >
              <Feather
                name="shopping-cart"
                size={18}
                color={bazarToday ? "#B45309" : "#0F766E"}
              />
            </View>
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
        ) : null}

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
        ) : null}
      </View>
    </SummaryCardShell>
  );
};
