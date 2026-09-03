import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, TouchableOpacity, View } from "react-native";

export default function BazarListRoute() {
  const router = useRouter();

  return (
    <View className="pt-safe flex-1 bg-[#F4F8FC]">
      <StatusBar style="light" backgroundColor="#075F5B" />
      <View className="flex-row items-center bg-[#075F5B] px-4 pb-4 pt-2">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15"
          onPress={() => router.back()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="ml-3 font-inter-bold text-[18px] text-white">
          Bazar List
        </Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-orange-50">
          <Feather name="shopping-cart" size={28} color="#C2410C" />
        </View>
        <Text className="mt-4 font-inter-bold text-lg text-slate-900">
          Bazar List coming soon
        </Text>
      </View>
    </View>
  );
}
