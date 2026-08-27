import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/redux/hooks";

interface ProfileActionsProps {
  showSwitchMess?: boolean;
}

export const ProfileActions = ({
  showSwitchMess = true,
}: ProfileActionsProps) => {
  const { exitMess, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      void performLogout();
      return;
    }
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => void performLogout(),
      },
    ]);
  };

  return (
    <View className="gap-2.5 px-4">
      {showSwitchMess && (
        <TouchableOpacity
          className="flex-row items-center justify-center gap-2.5 rounded-[14px] border-[1.5px] border-emerald-200 bg-emerald-50 py-3.5"
          onPress={exitMess}
          activeOpacity={0.8}
        >
          <Feather name="grid" size={18} color="#0F766E" />
          <Text className="font-inter-semibold text-base text-teal-700">
            Switch Mess
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        className={`flex-row items-center justify-center gap-2.5 rounded-[14px] bg-red-600 py-[15px] ${loggingOut ? "opacity-60" : "opacity-100"}`}
        onPress={handleLogout}
        activeOpacity={0.8}
        disabled={loggingOut}
      >
        <Feather name="log-out" size={18} color="#fff" />
        <Text className="font-inter-bold text-base text-white">
          {loggingOut ? "Logging out\u2026" : "Log Out"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
