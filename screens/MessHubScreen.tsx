import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { MessHubContent } from "@/components/mess-hub/MessHubContent";

export const MessHubScreen = () => (
  <View className="flex-1 bg-gray-50">
    <StatusBar style="light" backgroundColor="#0F766E" />
    <MessHubContent />
  </View>
);
