import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MonthPicker from "@/components/MonthPicker";
import { NotificationBell } from "@/components/NotificationBell";
import { DashboardQuickNavDrawer } from "@/components/dashboard/DashboardQuickNavDrawer";
import { ManagerAdminOptionsCard } from "@/components/manager/ManagerAdminOptionsCard";
import { ManagerDuesCard } from "@/components/manager/ManagerDuesCard";
import { ManagerSummaryCard } from "@/components/manager/ManagerSummaryCard";
import {
  useAppDispatch,
  useAuth,
  useDrawer,
  useMess,
  useNetwork,
} from "@/redux/hooks";
import {
  apiActionFailed,
  offlineActionFailed,
} from "@/redux/slice/networkSlice";

export function ManagerScreen() {
  const router = useRouter();
  const { mess, role } = useAuth();
  const { openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { isOnline } = useNetwork();
  const { refreshMonth, dataLoading } = useMess();
  const [refreshing, setRefreshing] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showingKey, setShowingKey] = useState(false);
  const flipValue = useRef(new Animated.Value(0)).current;
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flipTo = useCallback(
    (showKey: boolean) => {
      Animated.timing(flipValue, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setShowingKey(showKey);
        flipValue.setValue(-1);
        Animated.timing(flipValue, {
          toValue: 0,
          duration: 130,
          useNativeDriver: true,
        }).start();
      });
    },
    [flipValue],
  );

  const copyMessKey = useCallback(async () => {
    if (!mess?.messKey) return;
    await Clipboard.setStringAsync(mess.messKey);
    setKeyCopied(true);
    flipTo(true);
    if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
    restoreTimerRef.current = setTimeout(() => {
      setKeyCopied(false);
      flipTo(false);
    }, 2400);
  }, [flipTo, mess?.messKey]);

  useEffect(
    () => () => {
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
      flipValue.stopAnimation();
    },
    [flipValue],
  );

  // A successful refreshMonth triggers the app-wide success toast on its own.
  const refreshManager = useCallback(async () => {
    if (!isOnline) {
      dispatch(offlineActionFailed("refresh"));
      return;
    }
    setRefreshing(true);
    try {
      await refreshMonth();
    } catch (error) {
      dispatch(
        apiActionFailed(
          error instanceof Error && error.message
            ? error.message
            : "Refresh failed. Please try again.",
        ),
      );
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, isOnline, refreshMonth]);

  useEffect(() => {
    if (role !== "admin") {
      router.replace("/(tabs)/dashboard");
    }
  }, [role, router]);

  if (role !== "admin") return null;

  return (
    <View
      className={`flex-1 bg-slate-50 ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
    >
      <StatusBar style="light" backgroundColor="#075F5B" />
      {Platform.OS !== "web" && (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-0 z-50 bg-[#075F5B]"
          style={{ height: insets.top }}
        />
      )}
      <LinearGradient
        colors={["#075F5B", "#00796F", "#019D83"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="relative overflow-hidden px-4 pb-5 pt-2"
      >
        <View className="absolute -bottom-10 -left-8 h-20 w-[65%] rotate-[5deg] rounded-[100%] bg-white/10" />
        <View className="absolute -bottom-12 right-[-30px] h-20 w-[72%] -rotate-[6deg] rounded-[100%] bg-white/10" />
        <View className="h-9 flex-row items-center gap-2">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/15"
            onPress={openDrawer}
            activeOpacity={0.7}
            accessibilityLabel="Open navigation menu"
          >
            <Feather name="menu" size={20} color="#fff" />
          </TouchableOpacity>
          <View className="min-w-0 flex-1 justify-center">
            <Text className="font-inter-bold text-[18px] text-white">
              Manager
            </Text>
          </View>
          <TouchableOpacity
            className="max-w-[132px] shrink flex-row items-center gap-1.5 rounded-full border border-white/15 bg-white/15 px-2.5 py-2"
            onPress={() => void copyMessKey()}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Copy mess key"
          >
            <Animated.View
              className="min-w-0 shrink"
              style={{
                transform: [
                  {
                    rotateY: flipValue.interpolate({
                      inputRange: [-1, 0, 1],
                      outputRange: ["-90deg", "0deg", "90deg"],
                    }),
                  },
                ],
              }}
            >
              <Text
                className={`font-inter-bold text-[11px] text-white ${showingKey ? "tracking-[1.4px]" : "tracking-[0.1px]"}`}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={1}
              >
                {showingKey ? (mess?.messKey ?? "——") : (mess?.name ?? "Mess")}
              </Text>
            </Animated.View>
            <Feather
              name={keyCopied ? "check" : "copy"}
              size={12}
              color={keyCopied ? "#A7F3D0" : "rgba(255,255,255,0.82)"}
              allowFontScaling={false}
            />
          </TouchableOpacity>
          <NotificationBell
            badgeBorderColor="#00796F"
            iconSize={20}
            buttonPadding={2}
          />
        </View>
      </LinearGradient>

      <DashboardQuickNavDrawer returnTo="manager" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName={
          Platform.OS === "web" ? "pb-[118px]" : "pb-safe-offset-[49px]"
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refreshManager()}
            tintColor="#0e7871"
            colors={["#0e7871"]}
          />
        }
      >
        {/* The picker writes the selected month to mess state, which every card
            below already reads, so they all follow it. `overlapAbove` is off
            because the quick-nav drawer sits directly above this, not a card
            the picker is meant to lift over. */}
        <MonthPicker
          variant="dashboard"
          monthDataLoading={dataLoading}
          showSyncStatus={false}
          overlapAbove={false}
        />

        <ManagerSummaryCard />

        <ManagerAdminOptionsCard
          options={[
            {
              label: "Meal Status",
              icon: "calendar-outline",
              tintClassName: "bg-emerald-50",
              iconColor: "#059669",
              onPress: () => router.push("/meal-status?returnTo=manager"),
            },
            {
              label: "Member Requests",
              icon: "mail-unread-outline",
              tintClassName: "bg-violet-50",
              iconColor: "#6D28D9",
              onPress: () => router.push("/member-requests?returnTo=manager"),
            },
            {
              label: "All Members",
              icon: "people-outline",
              tintClassName: "bg-teal-50",
              iconColor: "#0F766E",
              onPress: () => router.push("/consumers?returnTo=manager"),
            },
            {
              label: "Mess Settings",
              icon: "shield-checkmark-outline",
              tintClassName: "bg-amber-50",
              iconColor: "#B45309",
              onPress: () => router.push("/settings/security?returnTo=manager"),
            },
            {
              label: "Add Member",
              icon: "person-add-outline",
              tintClassName: "bg-sky-50",
              iconColor: "#0284C7",
              // Lands on the members page with its add form already open.
              onPress: () => router.push("/consumers?returnTo=manager&add=1"),
            },
            // The three below switch tabs rather than stacking a screen, so
            // they use navigate the way the app drawer does.
            {
              label: "Add Meals",
              icon: "restaurant-outline",
              tintClassName: "bg-orange-50",
              iconColor: "#EA580C",
              onPress: () => router.navigate("/(tabs)/meals"),
            },
            {
              label: "Add Expense",
              icon: "cash-outline",
              tintClassName: "bg-rose-50",
              iconColor: "#E11D48",
              onPress: () => router.navigate("/(tabs)/expenses"),
            },
            {
              label: "Add Deposit",
              icon: "wallet-outline",
              tintClassName: "bg-indigo-50",
              iconColor: "#4F46E5",
              onPress: () => router.navigate("/(tabs)/deposits"),
            },
          ]}
        />
        <ManagerDuesCard />
      </ScrollView>
    </View>
  );
}
