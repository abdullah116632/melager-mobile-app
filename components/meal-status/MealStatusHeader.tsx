import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TouchableOpacity, View } from "react-native";

interface MealStatusHeaderProps {
  onBack: () => void;
}

export const MealStatusHeader = ({ onBack }: MealStatusHeaderProps) => {
  return (
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
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View className="min-w-0 flex-1 justify-center">
          <Text className="font-inter-bold text-[18px] tracking-[0.1px] text-white">
            Meal Status
          </Text>
          <Text className="mt-0.5 font-inter text-[10px] text-white/70">
            Manage daily meals and availability
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};
