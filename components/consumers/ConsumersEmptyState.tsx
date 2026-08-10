import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

type ConsumersEmptyStateProps = {
  icon: ComponentProps<typeof Feather>["name"];
  iconSize: number;
  title: string;
  description: string;
};

export const ConsumersEmptyState = ({
  icon,
  iconSize,
  title,
  description,
}: ConsumersEmptyStateProps) => (
  <View className="flex-1 items-center justify-center gap-3 px-8">
    <Feather name={icon} size={iconSize} color="#64748B" />
    <Text className="mt-1 font-inter-bold text-lg text-slate-900">{title}</Text>
    <Text className="text-center font-inter text-sm text-slate-500">
      {description}
    </Text>
  </View>
);
