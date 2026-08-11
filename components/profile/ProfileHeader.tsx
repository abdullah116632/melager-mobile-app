import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TouchableOpacity, View } from "react-native";

import { getProfileAvatarColor, getProfileInitials } from "@/utils/profile";

const AVATAR_CLASS_BY_COLOR: Record<string, string> = {
  "#0D9488": "bg-teal-600",
  "#0284C7": "bg-sky-600",
  "#7C3AED": "bg-violet-600",
  "#DB2777": "bg-pink-600",
  "#EA580C": "bg-orange-600",
  "#059669": "bg-emerald-600",
};

interface ProfileHeaderProps {
  name: string;
  email: string;
  isAdmin: boolean;
  onBack: () => void;
}

export const ProfileHeader = ({
  name,
  email,
  isAdmin,
  onBack,
}: ProfileHeaderProps) => {
  const avatarClassName =
    AVATAR_CLASS_BY_COLOR[getProfileAvatarColor(name)] ?? "bg-teal-600";

  return (
    <LinearGradient
      colors={["#0F766E", "#115E59", "#0B413D"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="px-4 pb-6 pt-4"
    >
      <View className="flex-row items-center">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-xl text-white">My Profile</Text>
          <Text className="mt-0.5 font-inter text-xs text-teal-100/75">
            Account & mess settings
          </Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10">
          <Feather name="user" size={18} color="#D5F5F0" />
        </View>
      </View>

      <View className="mt-5 flex-row items-center rounded-3xl border border-white/15 bg-white/10 p-3.5">
        <View
          className={`h-[68px] w-[68px] items-center justify-center rounded-2xl ${avatarClassName}`}
        >
          <Text className="font-inter-bold text-[24px] text-white">
            {getProfileInitials(name)}
          </Text>
        </View>
        <View className="ml-3.5 min-w-0 flex-1">
          <Text
            className="font-inter-bold text-[18px] text-white"
            numberOfLines={1}
          >
            {name}
          </Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <Feather name="mail" size={12} color="#CCFBF1" />
            <Text
              className="flex-1 font-inter text-xs text-teal-50/80"
              numberOfLines={1}
            >
              {email || "No email address"}
            </Text>
          </View>
          <View
            className={`mt-2.5 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${isAdmin ? "bg-amber-300/20" : "bg-white/15"}`}
          >
            <Feather
              name={isAdmin ? "shield" : "users"}
              size={12}
              color={isAdmin ? "#FDE68A" : "#D5F5F0"}
            />
            <Text
              className={`font-inter-semibold text-[11px] ${isAdmin ? "text-amber-100" : "text-teal-50"}`}
            >
              {isAdmin ? "Mess Admin" : "Mess Member"}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
};
