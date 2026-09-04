import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

type ConsumersHeaderProps = {
  returnTo?: "dashboard" | "manager";
  loading: boolean;
  totalConsumers: number;
  onRefresh: () => void;
  onAddMember?: () => void;
};

export const ConsumersHeader = ({
  returnTo = "dashboard",
  loading,
  totalConsumers,
  onRefresh,
  onAddMember,
}: ConsumersHeaderProps) => {
  const router = useRouter();

  return (
    <View className="flex-row items-center gap-3 bg-teal-700 px-4 pb-5 pt-4">
      <TouchableOpacity
        className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10"
        onPress={() =>
          router.replace(
            returnTo === "manager" ? "/(tabs)/manager" : "/(tabs)/dashboard",
          )
        }
        activeOpacity={0.7}
      >
        <Feather name="arrow-left" size={22} color="#fff" />
      </TouchableOpacity>
      <View className="flex-1">
        <Text className="font-inter-bold text-xl text-white">Consumers</Text>
        <Text className="mt-0.5 font-inter text-xs text-white/70">
          Manage your mess members
        </Text>
      </View>
      {!loading && (
        <View className="rounded-full bg-white/15 px-2.5 py-1.5">
          <Text className="font-inter-semibold text-xs text-white">
            {totalConsumers}
          </Text>
        </View>
      )}
      {onAddMember ? (
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10"
          onPress={onAddMember}
          activeOpacity={0.7}
          accessibilityLabel="Add member"
        >
          <Feather name="user-plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10"
        onPress={onRefresh}
        activeOpacity={0.7}
        disabled={loading}
      >
        <Feather
          name="refresh-cw"
          size={17}
          color={loading ? "rgba(255,255,255,0.45)" : "#FFFFFF"}
        />
      </TouchableOpacity>
    </View>
  );
};
