import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";
import type { useColors } from "@/hooks/useColors";

interface MealsEmptyStateProps {
  colors: ReturnType<typeof useColors>;
}

export const MealsEmptyState = ({ colors }: MealsEmptyStateProps) => (
  <View style={styles.container}>
    <Feather name="users" size={48} color={colors.mutedForeground} />
    <Text style={[styles.title, { color: colors.foreground }]}>
      No consumers yet
    </Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
      Tap the icon above to add your first consumer
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
