import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export const DashboardSummaryButton = ({
  sending,
  onPress,
}: {
  sending: boolean;
  onPress: () => void;
}) => (
  <View className="mx-4 mt-3 overflow-hidden rounded-[15px] shadow-lg shadow-blue-500/25">
    <LinearGradient
      colors={["#1458F5", "#173BFF", "#315DFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ borderRadius: 15 }}
    >
      <TouchableOpacity
        className={`flex-row items-center justify-center gap-3 px-4 py-4 ${sending ? "opacity-60" : "opacity-100"}`}
        onPress={onPress}
        disabled={sending}
        activeOpacity={0.82}
      >
        {sending ? (
          <ActivityIndicator size={18} color="#fff" />
        ) : (
          <Feather name="send" size={19} color="#fff" />
        )}
        <Text className="flex-1 text-center font-inter-semibold text-[15px] text-white">
          {sending ? "Sending…" : "Email Monthly Summary to Members"}
        </Text>
        {!sending && <Feather name="chevron-right" size={21} color="#fff" />}
      </TouchableOpacity>
    </LinearGradient>
  </View>
);
