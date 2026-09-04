import { View } from "react-native";
import { SecurityContent } from "@/components/settings/SecurityContent";

export const SecurityScreen = ({
  returnTo,
}: {
  returnTo?: "dashboard" | "manager";
}) => (
  <View className="flex-1 bg-slate-50">
    <SecurityContent returnTo={returnTo} />
  </View>
);
