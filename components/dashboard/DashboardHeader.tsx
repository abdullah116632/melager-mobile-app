import Feather from "@expo/vector-icons/Feather";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/redux/hooks";
import { useDrawer } from "@/redux/hooks";

export const DashboardHeader = () => {
  const { mess } = useAuth();
  const { openDrawer } = useDrawer();
  const [keyCopied, setKeyCopied] = useState(false);

  const copyMessKey = useCallback(async () => {
    if (!mess?.messKey) return;
    await Clipboard.setStringAsync(mess.messKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 1800);
  }, [mess?.messKey]);

  return (
    <LinearGradient
      colors={["#075F5B", "#00796F", "#019D83"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="relative overflow-hidden px-4 pb-5 pt-2"
    >
      <View className="absolute -bottom-10 -left-8 h-20 w-[65%] rotate-[5deg] rounded-[100%] bg-white/10" />
      <View className="absolute -bottom-12 right-[-30px] h-20 w-[72%] -rotate-[6deg] rounded-[100%] bg-white/10" />
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          className="h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-white/10 bg-white/15"
          onPress={openDrawer}
          activeOpacity={0.7}
        >
          <Feather name="menu" size={21} color="#fff" />
        </TouchableOpacity>
        <View className="h-[40px] w-[40px] items-center justify-center rounded-full border-2 border-white bg-emerald-50 shadow-lg shadow-black/20">
          <Feather name="coffee" size={19} color="#047857" />
        </View>
        <View className="min-w-0 flex-1 justify-center">
          <Text
            className="font-inter-bold text-[20px] tracking-[0.1px] text-white"
            numberOfLines={1}
          >
            Dashboard
          </Text>
        </View>
        <NotificationBell badgeBorderColor="#00796F" />
        <TouchableOpacity
          className="shrink-0 flex-row items-center gap-1.5 rounded-full border border-white/15 bg-white/15 px-2.5 py-2"
          onPress={() => void copyMessKey()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Copy mess key"
        >
          <Text
            className="font-inter-bold text-[11px] tracking-[1.4px] text-white"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {mess?.messKey ?? "——"}
          </Text>
          <Feather
            name={keyCopied ? "check" : "copy"}
            size={13}
            color={keyCopied ? "#A7F3D0" : "rgba(255,255,255,0.82)"}
          />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};
