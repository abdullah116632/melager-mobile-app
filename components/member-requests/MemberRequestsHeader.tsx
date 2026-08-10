import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

interface MemberRequestsHeaderProps {
  onBack: () => void;
  onRefresh: () => void;
}

export const MemberRequestsHeader = ({
  onBack,
  onRefresh,
}: MemberRequestsHeaderProps) => (
  <View className="flex-row items-center gap-3 bg-teal-700 px-4 py-3.5">
    <TouchableOpacity className="p-1" onPress={onBack} activeOpacity={0.7}>
      <Feather name="arrow-left" size={22} color="#fff" />
    </TouchableOpacity>
    <Text className="flex-1 font-inter-bold text-lg text-white">
      Member Requests
    </Text>
    <TouchableOpacity className="p-1" onPress={onRefresh} activeOpacity={0.7}>
      <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />
    </TouchableOpacity>
  </View>
);
