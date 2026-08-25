import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

import { useNotifications } from "@/redux/hooks";

interface NotificationBellProps {
  badgeBorderColor?: string;
}

const getBadgeBorderClassName = (color: string) => {
  const normalizedColor = color.toUpperCase();

  if (normalizedColor === "#0F766E") return "border-teal-700";
  if (normalizedColor === "#7C3AED") return "border-violet-600";
  return "border-transparent";
};

export function NotificationBell({
  badgeBorderColor = "#0F766E",
}: NotificationBellProps) {
  const { unreadCount, openPanel } = useNotifications();
  const badgeCount = unreadCount > 99 ? "99+" : unreadCount;
  const usesKnownBorderColor = ["#0F766E", "#7C3AED"].includes(
    badgeBorderColor.toUpperCase(),
  );

  return (
    <TouchableOpacity
      className="relative p-1"
      onPress={openPanel}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Feather name="bell" size={22} color="#fff" />
      {unreadCount > 0 && (
        <View
          className={`absolute -right-px -top-px h-[17px] min-w-[17px] items-center justify-center rounded-full border-[1.5px] bg-red-500 px-[3px] ${getBadgeBorderClassName(badgeBorderColor)}`}
          style={
            usesKnownBorderColor ? undefined : { borderColor: badgeBorderColor }
          }
        >
          <Text className="font-inter-bold text-[9px] leading-3 text-white">
            {badgeCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
