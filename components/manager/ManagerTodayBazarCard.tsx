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
import { getBazarWeekday, getBazarWeekdayName } from "@/utils/bazar";
import { getDhakaDate } from "@/utils/dashboard";

const cardShadow = {
  shadowColor: "#94A3B8",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.16,
  shadowRadius: 8,
  elevation: 3,
};

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
    <View
      className="mx-4 mb-4 overflow-hidden rounded-[18px] border border-slate-300 bg-white"
      style={cardShadow}
    >
      <TouchableOpacity
        className="flex-row items-center gap-2 px-4 py-3"
        onPress={openBazarList}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Open bazar list"
      >
        <View className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
          <Feather name="shopping-cart" size={16} color="#475569" />
        </View>
        <Text className="flex-1 font-inter-semibold text-sm text-slate-800">
          Today&apos;s Bazar
        </Text>
        <Text className="font-inter-medium text-[11px] text-slate-500">
          {getBazarWeekdayName(today)}
        </Text>
        <Feather name="chevron-right" size={16} color="#94A3B8" />
      </TouchableOpacity>

      <View className="gap-2 px-3 pb-3">
        <View className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <Text className="font-inter-medium text-[11px] text-slate-500">
            Assigned for today
          </Text>
          {assigned.length > 0 ? (
            <View className="mt-1.5 flex-row flex-wrap gap-1.5">
              {assigned.map((assignment) => (
                <View
                  key={assignment.id}
                  className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1"
                >
                  <Text className="font-inter-semibold text-xs text-teal-800">
                    {assignment.name ?? "Unnamed member"}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="mt-1 font-inter-semibold text-[13px] text-slate-700">
              No one is assigned today.{" "}
              <Text className="font-inter text-slate-500">
                Assign from the Bazar List.
              </Text>
            </Text>
          )}
        </View>

        <TouchableOpacity
          className={`flex-row items-center gap-2 rounded-xl border p-3 ${
            itemCount > 0
              ? "border-slate-200 bg-slate-50"
              : "border-amber-200 bg-amber-50"
          }`}
          onPress={openBazarList}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Open bazar list"
        >
          <Feather
            name="list"
            size={15}
            color={itemCount > 0 ? "#0F766E" : "#B45309"}
          />
          {itemCount > 0 ? (
            <Text className="flex-1 font-inter-semibold text-[13px] text-slate-800">
              {itemCount} {itemCount === 1 ? "item" : "items"} added
            </Text>
          ) : (
            <Text className="flex-1 font-inter-semibold text-[13px] text-amber-800">
              No items added yet. Add today&apos;s bazar items.
            </Text>
          )}
          <Feather name="chevron-right" size={16} color="#94A3B8" />
        </TouchableOpacity>

        {itemCount > 0 ? (
          <>
            <TouchableOpacity
              className={`flex-row items-center justify-center rounded-xl border px-3 py-2.5 ${
                canNotify
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-100"
              }`}
              onPress={() => void notifyAssignedMembers()}
              disabled={notifying || !canNotify}
              accessibilityLabel="Notify assigned members"
              accessibilityState={{ disabled: !canNotify }}
            >
              <Feather
                name="bell"
                size={15}
                color={canNotify ? "#047857" : "#94A3B8"}
              />
              {notifying ? (
                <ActivityIndicator
                  className="ml-2"
                  size="small"
                  color="#047857"
                />
              ) : (
                <Text
                  className={`ml-2 font-inter-semibold text-xs ${
                    canNotify ? "text-emerald-800" : "text-slate-400"
                  }`}
                >
                  Notify assigned members
                </Text>
              )}
            </TouchableOpacity>
            {!canNotify ? (
              <Text className="font-inter text-[11px] text-slate-500">
                Assign at least one member before sending a notification.
              </Text>
            ) : null}
          </>
        ) : null}
      </View>
    </View>
  );
};
