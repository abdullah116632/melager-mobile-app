import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";

export const MealsEmptyState = () => (
  <View className="flex-1 items-center justify-center gap-3 px-10">
    <Feather name="users" size={48} color="#64748B" />
    <Text className="font-inter-semibold text-lg text-slate-900">
      No consumers yet
    </Text>
    <Text className="text-center font-inter text-sm text-slate-500">
      Tap the icon above to add your first consumer
    </Text>
  </View>
);
