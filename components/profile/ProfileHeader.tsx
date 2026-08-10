import Feather from "@expo/vector-icons/Feather";
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
    <View className="flex-row items-center gap-3 bg-teal-700 px-4 py-4">
      <TouchableOpacity
        className="h-9 w-9 items-center justify-center"
        onPress={onBack}
        activeOpacity={0.7}
        accessibilityLabel="Go back"
      >
        <Feather name="arrow-left" size={22} color="#fff" />
      </TouchableOpacity>
      <View
        className={`h-[52px] w-[52px] items-center justify-center rounded-full ${avatarClassName}`}
      >
        <Text className="font-inter-bold text-xl text-white">
          {getProfileInitials(name)}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-inter-bold text-[17px] text-white">{name}</Text>
        <Text className="mt-0.5 font-inter text-xs text-white/75">{email}</Text>
      </View>
      <View
        className={`rounded-[20px] px-2.5 py-[5px] ${isAdmin ? "bg-white/25" : "bg-white/15"}`}
      >
        <Text className="font-inter-semibold text-xs text-white">
          {isAdmin ? "Admin" : "Member"}
        </Text>
      </View>
    </View>
  );
};
