import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";
import type { AppColors } from "@/types/theme";
import { memberRequestStyles as styles } from "./memberRequestStyles";

interface MemberRequestsEmptyStateProps {
  colors: AppColors;
  variant: "empty" | "no-results";
}

export const MemberRequestsEmptyState = ({
  colors,
  variant,
}: MemberRequestsEmptyStateProps) => {
  const hasNoResults = variant === "no-results";

  return (
    <View style={styles.centered}>
      <Feather
        name={hasNoResults ? "search" : "check-circle"}
        size={hasNoResults ? 40 : 52}
        color={colors.mutedForeground}
      />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {hasNoResults ? "No results" : "All caught up!"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
        {hasNoResults
          ? "Try a different name or email."
          : "No pending join requests right now."}
      </Text>
    </View>
  );
};
