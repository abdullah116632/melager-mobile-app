import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface MessHubHeaderProps {
  firstName?: string;
  email?: string;
  loading: boolean;
  messCount: number;
  requestCount: number;
  onLogout: () => void;
  onProfile: () => void;
}

export const MessHubHeader = ({
  firstName,
  email,
  loading,
  messCount,
  requestCount,
  onLogout,
  onProfile,
}: MessHubHeaderProps) => (
  <LinearGradient
    colors={["#0F766E", "#115E59", "#083D3A"]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    className="pt-safe-offset-5 overflow-hidden px-5 pb-7"
  >
    <View
      pointerEvents="none"
      className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-white/[0.08]"
    />
    <View
      pointerEvents="none"
      className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-emerald-300/[0.12]"
    />
    <View
      pointerEvents="none"
      className="absolute right-24 top-16 h-12 w-12 rounded-full border border-white/[0.12]"
    />

    <View className="flex-row items-center gap-3.5">
      <TouchableOpacity
        className="flex-1 flex-row items-center gap-3.5"
        onPress={onProfile}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Open account profile"
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-sm shadow-black/20">
          <Feather name="user" size={23} color="#ECFDF5" />
        </View>
        <View className="flex-1">
          <Text className="font-inter-semibold text-[11px] tracking-[1.2px] text-teal-100/75">
            MELAGER · VIEW PROFILE
          </Text>
          <Text className="mt-0.5 font-inter-bold text-[22px] text-white">
            Hello, {firstName ?? "there"}!
          </Text>
          {!!email && (
            <Text
              className="mt-0.5 font-inter text-[11px] text-teal-100/75"
              numberOfLines={1}
            >
              {email}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator
          size="small"
          color="rgba(255,255,255,0.8)"
          className="p-2.5"
        />
      ) : (
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-red-200/40 bg-red-500 shadow-sm shadow-black/20"
          onPress={() =>
            Alert.alert(
              "Log out?",
              "You will need to sign in again to access your messes.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: onLogout },
              ],
            )
          }
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Feather name="log-out" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>

    <View className="mt-5 flex-row items-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/20">
        <Feather name="layout" size={19} color="#D1FAE5" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-inter-semibold text-[14px] text-white">
          Your mess space
        </Text>
        <Text className="mt-0.5 font-inter text-xs text-teal-50/75">
          Choose a mess or start something new
        </Text>
      </View>
      <View className="items-end">
        <Text className="font-inter-bold text-lg text-white">{messCount}</Text>
        <Text className="font-inter-medium text-[10px] text-teal-100/75">
          {messCount === 1 ? "MESS" : "MESSES"}
        </Text>
      </View>
    </View>

    {requestCount > 0 && (
      <View className="mt-3 self-start rounded-full border border-amber-200/25 bg-amber-100/15 px-3 py-1.5">
        <Text className="font-inter-semibold text-[11px] text-amber-100">
          {requestCount} pending {requestCount === 1 ? "request" : "requests"}
        </Text>
      </View>
    )}
  </LinearGradient>
);
