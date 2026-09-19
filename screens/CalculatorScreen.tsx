import Feather from "@expo/vector-icons/Feather";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Calculator } from "@/components/Calculator";

export const CalculatorScreen = ({
  returnTo = "dashboard",
}: {
  returnTo?: "dashboard" | "manager";
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      className={`flex-1 bg-[#F4F8FC] ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
    >
      <StatusBar style="light" backgroundColor="#075F5B" />
      {Platform.OS !== "web" ? (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-0 z-50 bg-[#075F5B]"
          style={{ height: insets.top }}
        />
      ) : null}
      <View className="flex-row items-center bg-[#075F5B] px-4 pb-4 pt-2">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15"
          onPress={() =>
            router.replace(
              returnTo === "manager" ? "/(tabs)/manager" : "/(tabs)/dashboard",
            )
          }
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-[18px] text-white">
            Calculator
          </Text>
        </View>
      </View>
      <View
        className={`flex-1 px-4 pt-4 ${Platform.OS === "web" ? "pb-6" : "pb-safe-offset-4"}`}
      >
        <Calculator />
      </View>
    </View>
  );
};
