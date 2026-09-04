import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificationBell } from "@/components/NotificationBell";
import { DashboardQuickNavDrawer } from "@/components/dashboard/DashboardQuickNavDrawer";
import { ManagerAdminOptionsCard } from "@/components/manager/ManagerAdminOptionsCard";
import { ManagerSummaryCard } from "@/components/manager/ManagerSummaryCard";
import { useAuth, useDrawer } from "@/redux/hooks";

export function ManagerScreen() {
  const router = useRouter();
  const { mess, role } = useAuth();
  const { openDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
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
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/15"
            onPress={openDrawer}
            activeOpacity={0.7}
            accessibilityLabel="Open navigation menu"
          >
            <Feather name="menu" size={20} color="#fff" />
          </TouchableOpacity>
          <View className="min-w-0 flex-1 justify-center">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="shield-checkmark" size={17} color="#A7F3D0" />
              <Text className="font-inter-bold text-[18px] text-white">
                Manager
              </Text>
            </View>
            <Text className="mt-0.5 font-inter text-[10px] text-white/70">
              Manage your mess and member activity.
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
            icon: "person-add-outline",
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
            label: "Security",
            icon: "shield-checkmark-outline",
            tintClassName: "bg-amber-50",
            iconColor: "#B45309",
            onPress: () => router.push("/settings/security?returnTo=manager"),
          },
        ]}
      />
    </View>
  );
}
