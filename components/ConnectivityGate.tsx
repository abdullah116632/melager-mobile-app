import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetwork } from "@/redux/hooks";

const ConnectionBackground = ({ children }: { children: ReactNode }) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["#064E4A", "#08766E", "#12A58C"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="absolute inset-0 z-[1000] overflow-hidden px-5"
      style={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}
    >
      <StatusBar style="light" backgroundColor="#064E4A" />
      <View className="absolute -right-24 -top-20 h-[260px] w-[260px] rounded-full bg-white/[0.06]" />
      <View className="absolute -left-28 top-[32%] h-[230px] w-[230px] rounded-full border-[30px] border-white/[0.04]" />
      <View className="absolute -bottom-28 right-[-30px] h-[260px] w-[260px] rounded-full bg-emerald-300/[0.08]" />

      <View className="flex-row items-center gap-3">
        <View className="h-[42px] w-[42px] items-center justify-center rounded-full border-2 border-white bg-emerald-50">
          <Feather name="coffee" size={20} color="#047857" />
        </View>
        <View>
          <Text className="font-inter-bold text-[17px] text-white">
            Meal Manager
          </Text>
          <Text className="font-inter text-[10px] tracking-[1.2px] text-white/60">
            STAY CONNECTED
          </Text>
        </View>
      </View>

      {children}
    </LinearGradient>
  );
};

export function ConnectivityGate() {
  const { isOnline, isCheckingNetwork } = useNetwork();

  if (isCheckingNetwork) {
    return (
      <ConnectionBackground>
        <View className="flex-1 items-center justify-center pb-16">
          <View className="h-[108px] w-[108px] items-center justify-center rounded-full border border-white/15 bg-white/10">
            <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-white">
              <ActivityIndicator size="large" color="#0F766E" />
            </View>
          </View>
          <Text className="mt-7 font-inter-bold text-[22px] text-white">
            Checking connection
          </Text>
          <Text className="mt-2 text-center font-inter text-[13px] text-white/70">
            This will only take a moment
          </Text>
        </View>
      </ConnectionBackground>
    );
  }

  if (!isOnline) {
    return (
      <ConnectionBackground>
        <View className="flex-1 justify-center pb-8">
          <View
            className="overflow-hidden rounded-[28px] bg-white px-6 pb-6 pt-7"
            style={{
              shadowColor: "#022C2A",
              shadowOpacity: 0.28,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 12 },
              elevation: 10,
            }}
          >
            <View className="items-center">
              <View className="relative h-[124px] w-[124px] items-center justify-center rounded-full bg-teal-50">
                <View className="absolute h-[96px] w-[96px] rounded-full border border-dashed border-teal-200" />
                <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-teal-700">
                  <Feather name="wifi-off" size={33} color="#FFFFFF" />
                </View>
                <View className="absolute bottom-1 right-1 h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-amber-400">
                  <Feather name="alert-circle" size={16} color="#78350F" />
                </View>
              </View>

              <View className="mt-5 rounded-full bg-red-50 px-3 py-1.5">
                <Text className="font-inter-bold text-[10px] tracking-[1.1px] text-red-600">
                  NO INTERNET CONNECTION
                </Text>
              </View>
              <Text className="mt-3 text-center font-inter-bold text-[26px] tracking-[-0.4px] text-slate-950">
                You’re offline
              </Text>
              <Text className="mt-2 max-w-[285px] text-center font-inter text-[14px] leading-[21px] text-slate-500">
                Check that your Wi-Fi or mobile data has working internet access
                to continue using Meal Manager.
              </Text>
            </View>

            <View className="mt-6 flex-row items-center rounded-[16px] border border-teal-100 bg-teal-50 px-4 py-3.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <ActivityIndicator size="small" color="#0F766E" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-inter-semibold text-[13px] text-teal-900">
                  Waiting for connection
                </Text>
                <Text className="mt-0.5 font-inter text-[10px] text-teal-700/70">
                  The app will reconnect automatically
                </Text>
              </View>
              <Feather name="refresh-cw" size={17} color="#0F766E" />
            </View>

            <View className="mt-5 flex-row items-center justify-center gap-1.5">
              <Feather name="shield" size={13} color="#64748B" />
              <Text className="font-inter-medium text-[10px] text-slate-500">
                Your account and data remain secure
              </Text>
            </View>
          </View>
        </View>
      </ConnectionBackground>
    );
  }

  return null;
}
