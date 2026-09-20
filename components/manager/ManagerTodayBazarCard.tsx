import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SummaryBadge,
  SummaryCardShell,
} from "@/components/dashboard/DashboardSummaryParts";
import {
  useAppDispatch,
  useAppSelector,
  useAuth,
  useNetwork,
} from "@/redux/hooks";
import {
  loadBazar,
  notifyBazarMembers,
  selectBazarState,
} from "@/redux/slice/bazarSlice";
import {
  formatBazarDate,
  getBazarWeekday,
  getBazarWeekdayName,
} from "@/utils/bazar";
import { getDhakaDate } from "@/utils/dashboard";

const cartIcon = <Feather name="shopping-cart" size={19} color="#0F766E" />;

export const ManagerTodayBazarCard = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { mess } = useAuth();
  const { isOnline } = useNetwork();
  const { items, assignments } = useAppSelector(selectBazarState);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    if (!mess?.id) return;
    // Shows the saved SQLite copy first, then refreshes when online.
    void dispatch(loadBazar({ includeConsumers: true }))
      .unwrap()
      .catch(() => undefined);
  }, [dispatch, isOnline, mess?.id]);

  const today = getDhakaDate();
  const todayWeekday = getBazarWeekday(today);
  const assigned = assignments.filter(
    (assignment) => assignment.weekday === todayWeekday,
  );
  const itemCount = items.filter((item) => item.bazarDate === today).length;
  const canNotify = itemCount > 0 && assigned.length > 0;
  const openBazarList = () => router.push("/bazar-list?returnTo=manager");

  const notifyAssignedMembers = async () => {
    setNotifying(true);
    try {
      const result = await dispatch(
        notifyBazarMembers({ bazarDate: today }),
      ).unwrap();
      Alert.alert(
        result.queued ? "Saved offline" : "Notifications sent",
        result.queued
          ? "Assigned members will be notified when you are online."
          : "Assigned members have been notified.",
      );
    } catch (error) {
      Alert.alert(
        "Could not notify members",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setNotifying(false);
    }
  };

  return (
    <SummaryCardShell
      icon={cartIcon}
      title="Today's Bazar"
      subtitle={`${getBazarWeekdayName(today)}, ${formatBazarDate(today)}`}
      badge={
        itemCount > 0 ? (
          <SummaryBadge
            label={`${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            tone="emerald"
          />
        ) : null
      }
    >
      <View className="gap-3">
        {assigned.length > 0 ? (
          <TouchableOpacity
            className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
            onPress={openBazarList}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Open bazar list"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-50">
              <Feather name="users" size={18} color="#0F766E" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-inter-medium text-[11px] text-slate-500">
                Assigned for today
              </Text>
              {/* Chips rather than one joined line: a name that would be cut off
                  mid-word is worse than a second row of chips. */}
              <View className="mt-1 flex-row flex-wrap gap-1.5">
                {assigned.map((assignment) => (
                  <View
                    key={assignment.id}
                    className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5"
                  >
                    <Text className="font-inter-semibold text-[11px] text-teal-800">
                      {assignment.name ?? "Unnamed member"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="flex-row items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3"
            onPress={openBazarList}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Open bazar list"
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-200">
              <Feather name="users" size={18} color="#64748B" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-inter-bold text-[13.5px] text-slate-700">
                No one is assigned today
              </Text>
              <Text className="mt-0.5 font-inter text-[11.5px] leading-4 text-slate-500">
                Pick who does today&apos;s bazar from the Bazar List.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className={`flex-row items-center gap-3 rounded-2xl border p-3 ${
            itemCount > 0
              ? "border-slate-200 bg-white"
              : "border-amber-300 bg-amber-50"
          }`}
          onPress={openBazarList}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Open bazar list"
        >
          <View
            className={`h-10 w-10 items-center justify-center rounded-full ${
              itemCount > 0 ? "bg-teal-50" : "bg-amber-100"
            }`}
          >
            <Feather
              name="list"
              size={18}
              color={itemCount > 0 ? "#0F766E" : "#B45309"}
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-inter-medium text-[11px] text-slate-500">
              Bazar list
            </Text>
            {itemCount > 0 ? (
              <Text
                className="font-inter-bold text-[14px] text-slate-900"
                numberOfLines={1}
              >
                {itemCount} {itemCount === 1 ? "item" : "items"} added
              </Text>
            ) : (
              <Text
                className="font-inter-bold text-[14px] text-amber-800"
                numberOfLines={1}
              >
                No items added yet
              </Text>
            )}
          </View>
          <Feather name="chevron-right" size={16} color="#94A3B8" />
        </TouchableOpacity>

        {itemCount > 0 ? (
          <View>
            <TouchableOpacity
              className={`flex-row items-center justify-center gap-2 rounded-2xl border p-3 ${
                canNotify
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-100"
              }`}
              onPress={() => void notifyAssignedMembers()}
              disabled={notifying || !canNotify}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Notify assigned members"
              accessibilityState={{ disabled: !canNotify }}
            >
              <Feather
                name="bell"
                size={15}
                color={canNotify ? "#047857" : "#94A3B8"}
              />
              {notifying ? (
                <ActivityIndicator size="small" color="#047857" />
              ) : (
                <Text
                  className={`font-inter-semibold text-[12.5px] ${
                    canNotify ? "text-emerald-800" : "text-slate-400"
                  }`}
                >
                  Notify assigned members
                </Text>
              )}
            </TouchableOpacity>
            {!canNotify ? (
              <Text className="mt-1.5 text-center font-inter text-[11px] text-slate-500">
                Assign at least one member before sending a notification.
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </SummaryCardShell>
  );
};
