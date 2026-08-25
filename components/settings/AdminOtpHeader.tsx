import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Platform, Text, TouchableOpacity, View } from "react-native";

interface AdminOtpHeaderProps {
  onBack: () => void;
}

export const AdminOtpHeader = ({ onBack }: AdminOtpHeaderProps) => (
  <LinearGradient
    colors={["#0F766E", "#115E59", "#0B413D"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    className={`px-4 pb-5 ${Platform.OS === "android" ? "pt-safe-offset-3" : "pt-safe-offset-2"}`}
  >
    <View className="flex-row items-center">
      <TouchableOpacity
        onPress={onBack}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
      >
        <Feather name="arrow-left" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      <View className="ml-3 flex-1">
        <Text className="font-inter-bold text-xl text-white">
          Email Verification
        </Text>
        <Text className="mt-0.5 font-inter text-xs text-teal-100/75">
          This page stays open while you check your email
        </Text>
      </View>
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10">
        <Feather name="mail" size={19} color="#CCFBF1" />
      </View>
    </View>
  </LinearGradient>
);
