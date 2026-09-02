import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/redux/hooks";

export const DashboardQuickNavDrawer = () => {
  const router = useRouter();
  const { exitMess } = useAuth();
  const [open, setOpen] = useState(false);

  const closeAndNavigate = (route: "/consumer-breakdown" | "/notice-board") => {
    setOpen(false);
    router.push(route);
  };

  if (!open) {
    return (
      <TouchableOpacity
        className="absolute left-0 top-[40%] z-50 h-12 w-7 items-center justify-center rounded-r-xl border border-l-0 border-teal-200 bg-white shadow-md shadow-slate-400/25"
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Open quick navigation"
      >
        <Feather name="chevron-right" size={20} color="#0F766E" />
      </TouchableOpacity>
    );
  }

  return (
    <View className="absolute bottom-0 left-0 top-0 z-50 w-[86px] border-r border-slate-200 bg-white shadow-xl shadow-slate-900/20">
      <View className="pt-safe-offset-3 items-center border-b border-slate-100 pb-3">
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100"
          onPress={() => setOpen(false)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Close quick navigation"
        >
          <Feather name="chevron-left" size={20} color="#334155" />
        </TouchableOpacity>
      </View>

      <View className="items-center gap-4 px-2 pt-5">
        <TouchableOpacity
          className="items-center"
          onPress={exitMess}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Switch mess"
        >
          <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-teal-50">
            <Feather name="repeat" size={18} color="#0F766E" />
          </View>
          <Text className="mt-1 text-center font-inter-semibold text-[9px] text-slate-600">
            Switch
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center"
          onPress={() => closeAndNavigate("/consumer-breakdown")}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Consumer breakdown"
        >
          <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-violet-50">
            <Feather name="users" size={18} color="#6D28D9" />
          </View>
          <Text className="mt-1 text-center font-inter-semibold text-[9px] text-slate-600">
            Breakdown
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center"
          onPress={() => closeAndNavigate("/notice-board")}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Notice board"
        >
          <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-amber-50">
            <Feather name="clipboard" size={18} color="#B45309" />
          </View>
          <Text className="mt-1 text-center font-inter-semibold text-[9px] text-slate-600">
            Notice Board
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
