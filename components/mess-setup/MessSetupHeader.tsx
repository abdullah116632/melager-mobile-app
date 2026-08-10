import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

interface MessSetupHeaderProps {
  firstName?: string;
  onBack: () => void;
}

export const MessSetupHeader = ({
  firstName,
  onBack,
}: MessSetupHeaderProps) => (
  <>
    <TouchableOpacity
      className="flex-row items-center gap-2 py-1"
      onPress={onBack}
    >
      <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.85)" />
      <Text className="font-inter-semibold text-sm text-white/85">
        Back to Hub
      </Text>
    </TouchableOpacity>

    <View className="mb-2 mt-2 items-center">
      <View className="mb-4 h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-xl shadow-black/20">
        <Feather name="coffee" size={30} color="#0F766E" />
      </View>
      <Text className="mb-[5px] font-inter-bold text-[26px] tracking-[0.2px] text-white">
        Hi, {firstName ?? "there"}!
      </Text>
      <Text className="font-inter text-sm text-white/70">Add another mess</Text>
    </View>
  </>
);
