import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";

export const MessHubEmptyState = () => (
  <View className="items-center px-6 py-12">
    <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-gray-100">
      <Feather name="home" size={36} color="#9CA3AF" />
    </View>
    <Text className="mb-2 font-inter-bold text-[17px] text-gray-700">
      No messes yet
    </Text>
    <Text className="text-center font-inter text-sm leading-[21px] text-gray-500">
      Create a new mess or join an existing one using a mess key.
    </Text>
  </View>
);
