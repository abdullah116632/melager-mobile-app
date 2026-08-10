import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";

interface MemberRequestsEmptyStateProps {
  variant: "empty" | "no-results";
}

export const MemberRequestsEmptyState = ({
  variant,
}: MemberRequestsEmptyStateProps) => {
  const hasNoResults = variant === "no-results";

  return (
    <View className="flex-1 items-center justify-center gap-3 px-8">
      <Feather
        name={hasNoResults ? "search" : "check-circle"}
        size={hasNoResults ? 40 : 52}
        color="#64748B"
      />
      <Text className="mt-1 font-inter-bold text-lg text-slate-900">
        {hasNoResults ? "No results" : "All caught up!"}
      </Text>
      <Text className="text-center font-inter text-sm text-slate-500">
        {hasNoResults
          ? "Try a different name or email."
          : "No pending join requests right now."}
      </Text>
    </View>
  );
};
