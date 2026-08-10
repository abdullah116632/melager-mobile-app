import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

type ConsumersHeaderProps = {
  loading: boolean;
  totalConsumers: number;
  onBack: () => void;
  onRefresh: () => void;
};

export const ConsumersHeader = ({
  loading,
  totalConsumers,
  onBack,
  onRefresh,
}: ConsumersHeaderProps) => (
  <View className="flex-row items-center gap-3 bg-teal-700 px-4 py-3.5">
    <TouchableOpacity
      className="h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-white/10"
      onPress={onBack}
      activeOpacity={0.7}
    >
      <Feather name="arrow-left" size={22} color="#fff" />
    </TouchableOpacity>
    <View className="flex-1">
      <Text className="font-inter-bold text-lg text-white">Consumers</Text>
      {!loading && (
        <Text className="mt-px font-inter text-xs text-white/70">
          {totalConsumers} total
        </Text>
      )}
    </View>
    <TouchableOpacity className="p-1.5" onPress={onRefresh} activeOpacity={0.7}>
      <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />
    </TouchableOpacity>
  </View>
);
