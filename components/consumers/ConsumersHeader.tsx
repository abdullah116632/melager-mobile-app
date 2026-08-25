import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

type ConsumersHeaderProps = {
  loading: boolean;
  totalConsumers: number;
  onRefresh: () => void;
};

export const ConsumersHeader = ({
  loading,
  totalConsumers,
  onRefresh,
}: ConsumersHeaderProps) => {
  const router = useRouter();

  return (
    <View className="flex-row items-center gap-3 bg-teal-700 px-4 pb-5 pt-4">
      <TouchableOpacity
        className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10"
        onPress={() => router.back()}
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
