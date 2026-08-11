import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";

export const AuthBrand = () => (
  <View className="mb-9 items-center">
    <View className="mb-[18px] h-[88px] w-[88px] items-center justify-center rounded-full bg-white shadow-xl shadow-black/20">
      <Feather name="coffee" size={38} color="#0F766E" />
    </View>
    <Text className="mb-1.5 font-inter-bold text-[30px] tracking-[0.3px] text-white">
      Melager
    </Text>
    <Text className="font-inter text-sm tracking-[0.1px] text-white/70">
      Track meals, expenses & deposits
    </Text>
  </View>
);
