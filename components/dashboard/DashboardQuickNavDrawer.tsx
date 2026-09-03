import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/redux/hooks";

export const DashboardQuickNavDrawer = () => {
  const router = useRouter();
  const { exitMess } = useAuth();

  const navigate = (
    route:
      | "/consumer-breakdown"
      | "/notice-board"
      | "/bazar-list"
      | "/messages",
  ) => {
    router.push(route);
  };

  return (
    <View className="mx-4 mb-2 mt-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm shadow-slate-400/15">
      <View className="flex-row items-center justify-around">
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
          onPress={() => navigate("/consumer-breakdown")}
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
          onPress={() => navigate("/notice-board")}
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
        <TouchableOpacity
          className="items-center"
          onPress={() => navigate("/bazar-list")}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Bazar list"
        >
          <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-orange-50">
            <Feather name="shopping-cart" size={18} color="#C2410C" />
          </View>
          <Text className="mt-1 text-center font-inter-semibold text-[9px] text-slate-600">
            Bazar List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center"
          onPress={() => navigate("/messages")}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Mess messages"
        >
          <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-sky-50">
            <Feather name="message-circle" size={18} color="#0369A1" />
          </View>
          <Text className="mt-1 text-center font-inter-semibold text-[9px] text-slate-600">
            Messages
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
