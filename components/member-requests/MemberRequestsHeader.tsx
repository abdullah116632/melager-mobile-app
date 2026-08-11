import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

interface MemberRequestsHeaderProps {
  loading: boolean;
  totalRequests: number;
  onBack: () => void;
  onRefresh: () => void;
}

export const MemberRequestsHeader = ({
  loading,
  totalRequests,
  onBack,
  onRefresh,
}: MemberRequestsHeaderProps) => (
  <View className="flex-row items-center gap-3 bg-teal-700 px-4 pb-5 pt-4">
    <TouchableOpacity
      className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10"
      onPress={onBack}
      activeOpacity={0.7}
      accessibilityLabel="Go back"
    >
      <Feather name="arrow-left" size={22} color="#fff" />
    </TouchableOpacity>
    <View className="flex-1">
      <Text className="font-inter-bold text-xl text-white">
        Member Requests
      </Text>
      <Text className="mt-0.5 font-inter text-xs text-white/70">
        Review pending member requests
      </Text>
    </View>
    {!loading && (
      <View className="rounded-full bg-white/15 px-2.5 py-1.5">
        <Text className="font-inter-semibold text-xs text-white">
          {totalRequests}
        </Text>
      </View>
    )}
    <TouchableOpacity
      className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10"
      onPress={onRefresh}
      activeOpacity={0.7}
      disabled={loading}
      accessibilityLabel="Refresh member requests"
    >
      <Feather
        name="refresh-cw"
        size={17}
        color={loading ? "rgba(255,255,255,0.45)" : "#FFFFFF"}
      />
    </TouchableOpacity>
  </View>
);
