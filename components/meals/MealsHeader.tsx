import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TouchableOpacity, View } from "react-native";
import { NotificationBell } from "@/components/NotificationBell";

interface MealsHeaderProps {
  isAdmin: boolean;
  onMenu: () => void;
  onAddConsumer: () => void;
}

export const MealsHeader = ({
  isAdmin,
  onMenu,
  onAddConsumer,
}: MealsHeaderProps) => (
  <LinearGradient
    colors={["#075F5B", "#00796F", "#019D83"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    className="relative overflow-hidden px-4 pb-5 pt-2"
  >
    <View className="absolute -bottom-10 -left-8 h-20 w-[65%] rotate-[5deg] rounded-[100%] bg-white/10" />
    <View className="absolute -bottom-12 right-[-30px] h-20 w-[72%] -rotate-[6deg] rounded-[100%] bg-white/10" />
    <View className="flex-row items-center gap-3">
      <TouchableOpacity
        className="h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-white/10 bg-white/15"
        onPress={onMenu}
        activeOpacity={0.7}
        accessibilityLabel="Open menu"
      >
        <Feather name="menu" size={21} color="#fff" />
      </TouchableOpacity>
      <View className="h-[40px] w-[40px] items-center justify-center rounded-full border-2 border-white bg-emerald-50 shadow-lg shadow-black/20">
        <Feather name="coffee" size={19} color="#047857" />
      </View>
      <Text
        className="flex-1 font-inter-bold text-[18px] tracking-[0.1px] text-white"
        numberOfLines={1}
      >
        Meals
      </Text>
      <NotificationBell badgeBorderColor="#00796F" />
      {isAdmin ? (
        <TouchableOpacity
          className="h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-white/10 bg-white/15"
          onPress={onAddConsumer}
          activeOpacity={0.75}
          accessibilityLabel="Add consumer"
        >
          <Feather name="user-plus" size={20} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View className="items-center rounded-md bg-white/20 px-1.5 py-1">
          <Text className="font-inter-bold text-[7px] leading-[9px] text-white">
            VIEW
          </Text>
          <Text className="font-inter-bold text-[7px] leading-[9px] text-white">
            ONLY
          </Text>
        </View>
      )}
    </View>
  </LinearGradient>
);
