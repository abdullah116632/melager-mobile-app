import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

interface MessHubHeaderProps {
  firstName?: string;
  loading: boolean;
  onLogout: () => void;
}

export const MessHubHeader = ({
  firstName,
  loading,
  onLogout,
}: MessHubHeaderProps) => (
  <View className="pt-safe-offset-5 overflow-hidden bg-[#0B5E57] px-5 pb-6">
    <View
      pointerEvents="none"
      className="absolute right-[-50px] top-[-60px] h-[220px] w-[220px] rounded-full bg-white/[0.07]"
    />
    <View
      pointerEvents="none"
      className="absolute bottom-[-20px] left-[-20px] h-[120px] w-[120px] rounded-full bg-white/[0.05]"
    />
    <View className="flex-row items-center gap-3.5">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
        <Feather name="coffee" size={22} color="#0F766E" />
      </View>
      <View className="flex-1">
        <Text className="font-inter-semibold text-xs tracking-[0.5px] text-white/60">
          Mess Manager
        </Text>
        <Text className="mt-px font-inter-bold text-lg text-white">
          Hi, {firstName ?? "there"}! {"\u{1F44B}"}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator
          size="small"
          color="rgba(255,255,255,0.7)"
          className="p-2"
        />
      ) : (
        <TouchableOpacity
          className="p-2"
          onPress={onLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      )}
    </View>
  </View>
);
