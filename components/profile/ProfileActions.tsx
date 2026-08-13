import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

interface ProfileActionsProps {
  loggingOut: boolean;
  onSwitchMess: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  showSwitchMess?: boolean;
}

export const ProfileActions = ({
  loggingOut,
  onSwitchMess,
  onLogout,
  onDeleteAccount,
  showSwitchMess = true,
}: ProfileActionsProps) => (
  <View className="gap-2.5 px-4">
    {showSwitchMess && (
      <TouchableOpacity
        className="flex-row items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-emerald-200 bg-emerald-50 py-3.5"
        onPress={onSwitchMess}
        activeOpacity={0.8}
      >
        <Feather name="grid" size={18} color="#0F766E" />
        <Text className="font-inter-semibold text-base text-teal-700">
          Switch Mess
        </Text>
      </TouchableOpacity>
    )}
    <TouchableOpacity
      className="flex-row items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-red-200 bg-red-50 py-3.5"
      onPress={onDeleteAccount}
      activeOpacity={0.8}
      disabled={loggingOut}
    >
      <Feather name="trash-2" size={18} color="#DC2626" />
      <Text className="font-inter-semibold text-base text-red-600">
        Delete Account
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      className={`flex-row items-center justify-center gap-2.5 rounded-[14px] bg-red-600 py-[15px] ${loggingOut ? "opacity-60" : "opacity-100"}`}
      onPress={onLogout}
      activeOpacity={0.8}
      disabled={loggingOut}
    >
      <Feather name="log-out" size={18} color="#fff" />
      <Text className="font-inter-bold text-base text-white">
        {loggingOut ? "Logging out…" : "Log Out"}
      </Text>
    </TouchableOpacity>
  </View>
);
