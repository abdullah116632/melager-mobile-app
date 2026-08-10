import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

interface MealFillBannerProps {
  visible: boolean;
  value: number;
  onDone: () => void;
}

export const MealFillBanner = ({
  visible,
  value,
  onDone,
}: MealFillBannerProps) => {
  if (!visible) return null;

  return (
    <View className="flex-row items-center bg-teal-500 px-3.5 py-2.5">
      <Feather name="copy" size={14} color="#fff" className="mr-1.5" />
      <Text className="flex-1 font-inter text-[13px] text-white">
        Fill mode · value: <Text className="font-inter-bold">{value}</Text> ·
        Drag or tap cells to fill
      </Text>
      <TouchableOpacity
        className="rounded-[20px] border border-white/30 bg-white/25 px-3.5 py-1.5"
        onPress={onDone}
      >
        <Text className="font-inter-bold text-[13px] text-white">Done</Text>
      </TouchableOpacity>
    </View>
  );
};
