import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth, useDrawer } from "@/redux/hooks";

interface MessHubHeaderProps {
  loading: boolean;
}

export const MessHubHeader = ({ loading }: MessHubHeaderProps) => {
  const { requests, logout } = useAuth();
  const { openDrawer } = useDrawer();
  const requestCount = requests.length;

  return (
    <LinearGradient
      colors={["#064E3B", "#0F766E", "#0F4C5C"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="pt-safe-offset-5 overflow-hidden px-5 pb-7"
    >
      <View
        pointerEvents="none"
        className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-teal-200/[0.1]"
      />
      <View
        pointerEvents="none"
        className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-amber-200/[0.1]"
      />
      <View
        pointerEvents="none"
        className="absolute right-24 top-16 h-12 w-12 rounded-full border border-white/[0.12]"
      />

      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className="h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100/20 bg-black/10 shadow-sm shadow-black/20"
          onPress={openDrawer}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <Feather name="menu" size={23} color="#ECFDF5" />
        </TouchableOpacity>

        <View className="mx-3 flex-1 items-center">
          <View className="flex-row items-center">
            <View className="mr-2.5 h-10 w-10 items-center justify-center rounded-2xl border border-amber-100/20 bg-amber-200/15">
              <Feather name="coffee" size={20} color="#FDE68A" />
            </View>
            <Text className="font-inter-bold text-[27px] tracking-[-0.8px] text-white">
              Meal
            </Text>
            <Text className="font-inter-bold text-[27px] tracking-[-0.8px] text-emerald-200">
              ager
            </Text>
          </View>
          <Text className="mt-1 font-inter-semibold text-[9px] tracking-[2px] text-teal-50/70">
            YOUR MESS, SIMPLIFIED
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="small"
            color="rgba(255,255,255,0.8)"
            className="h-12 w-12"
          />
        ) : (
          <TouchableOpacity
            className="h-12 w-12 items-center justify-center rounded-2xl border border-rose-100/25 bg-rose-400/20 shadow-sm shadow-black/20"
            onPress={() =>
              Alert.alert(
                "Log out?",
                "You will need to sign in again to access your messes.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Log Out",
                    style: "destructive",
                    onPress: () => void logout(),
                  },
                ],
              )
            }
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Feather name="log-out" size={18} color="#FFE4E6" />
          </TouchableOpacity>
        )}
      </View>

      {requestCount > 0 && (
        <View className="mt-5 self-start rounded-full border border-amber-200/25 bg-amber-100/15 px-3 py-1.5">
          <Text className="font-inter-semibold text-[11px] text-amber-100">
            {requestCount} pending {requestCount === 1 ? "request" : "requests"}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
};
