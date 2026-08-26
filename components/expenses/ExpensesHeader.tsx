import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TouchableOpacity, View } from "react-native";
import { useWindowDimensions } from "react-native";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth, useDrawer, useExpenses } from "@/redux/hooks";
import { formatExpenseAmount } from "@/utils/expense";

export const ExpensesHeader = () => {
  const { role } = useAuth();
  const { openDrawer } = useDrawer();
  const { width } = useWindowDimensions();
  const {
    currentYearMonth,
    currentMonthLoaded,
    dataLoading,
    getMonthExpenseTotal,
  } = useExpenses();
  const isAdmin = role === "admin";
  const isCompact = width < 380;
  const monthTotal =
    currentMonthLoaded && !dataLoading
      ? getMonthExpenseTotal(currentYearMonth)
      : 0;

  return (
    <LinearGradient
      colors={["#075F5B", "#00796F", "#019D83"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className={`relative overflow-hidden ${isCompact ? "px-3" : "px-4"} pb-5 pt-2`}
    >
      <View className="absolute -bottom-10 -left-8 h-20 w-[65%] rotate-[5deg] rounded-[100%] bg-white/10" />
      <View className="absolute -bottom-12 right-[-30px] h-20 w-[72%] -rotate-[6deg] rounded-[100%] bg-white/10" />
      <View className={`flex-row items-center ${isCompact ? "gap-1.5" : "gap-3"}`}>
        <TouchableOpacity
          className={`${isCompact ? "h-[34px] w-[34px]" : "h-[38px] w-[38px]"} items-center justify-center rounded-[11px] border border-white/10 bg-white/15`}
          onPress={openDrawer}
          activeOpacity={0.7}
          accessibilityLabel="Open menu"
        >
          <Feather name="menu" size={isCompact ? 19 : 21} color="#fff" />
        </TouchableOpacity>
        <View className="h-[40px] w-[40px] items-center justify-center rounded-full border-2 border-white bg-orange-50 shadow-lg shadow-black/20">
          <Feather name="shopping-bag" size={19} color="#C2410C" />
        </View>
        <Text
          className="min-w-0 flex-1 font-inter-bold text-[18px] tracking-[0.1px] text-white"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          Expenses
        </Text>
        <NotificationBell badgeBorderColor="#00796F" />
        <View className="shrink-0 rounded-full border border-white/20 bg-white/15 px-2 py-1.5">
          <Text
            className="font-inter-bold text-[12px] text-white"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            ৳{formatExpenseAmount(monthTotal) || "0"}
          </Text>
        </View>
        {!isAdmin && (
          <View className="items-center rounded-md bg-white/20 px-1.5 py-1">
            <Text className="font-inter-bold text-[7px] leading-[9px] text-white">
              VIEW
            </Text>
            <Text className="font-inter-bold text-[7px] leading-[9px] text-white">
              ONLY
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
};
