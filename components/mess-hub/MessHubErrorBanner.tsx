import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";

export const MessHubErrorBanner = ({ message }: { message: string }) => (
  <View className="mb-1 flex-row items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 p-3">
    <Feather name="alert-circle" size={14} color="#DC2626" />
    <Text className="flex-1 font-inter text-[13px] text-red-600">
      {message}
    </Text>
  </View>
);
