import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/redux/hooks";

export const SecurityHeader = () => {
  const router = useRouter();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
    }
  };

  return (
    <LinearGradient
      colors={["#0F766E", "#115E59", "#0B413D"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={`px-4 pb-6 ${Platform.OS === "android" ? "pt-safe-offset-3" : "pt-safe-offset-2"}`}
    >
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={goBack}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-xl text-white">Security</Text>
          <Text className="mt-0.5 font-inter text-xs text-teal-100/75">
            Protect your account and mess
          </Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10">
          <Feather name="shield" size={19} color="#CCFBF1" />
        </View>
      </View>

      <View className="mt-5 flex-row items-center rounded-3xl border border-white/15 bg-white/10 p-3.5">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/20">
          <Feather name="shield" size={24} color="#D1FAE5" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-[15px] text-white">
            Your account is protected
          </Text>
          <Text className="mt-0.5 font-inter text-xs leading-[18px] text-teal-50/75">
            Sensitive changes require email verification.
          </Text>
        </View>
        <View className="rounded-full bg-white/15 px-2.5 py-1.5">
          <Text className="font-inter-semibold text-[10px] text-teal-50">
            {isAdmin ? "ADMIN" : "MEMBER"}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};
