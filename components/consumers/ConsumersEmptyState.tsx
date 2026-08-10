import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";

import type { AppColors } from "@/types/theme";
import { consumerStyles as styles } from "./consumerStyles";

type ConsumersEmptyStateProps = {
  colors: AppColors;
  icon: ComponentProps<typeof Feather>["name"];
  iconSize: number;
  title: string;
  description: string;
};

export const ConsumersEmptyState = ({
  colors,
  icon,
  iconSize,
  title,
  description,
}: ConsumersEmptyStateProps) => (
  <View style={styles.centered}>
    <Feather name={icon} size={iconSize} color={colors.mutedForeground} />
    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
      {title}
    </Text>
    <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
      {description}
    </Text>
  </View>
);
