import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { Text, TouchableOpacity, View } from "react-native";
import { useWindowDimensions } from "react-native";
import { useDrawer, useExpenses } from "@/redux/hooks";
import { formatExpenseAmount } from "@/utils/expense";

export const ExpensesHeader = () => {
  const { openDrawer } = useDrawer();
  const { width } = useWindowDimensions();
  const {
    currentYearMonth,
    currentMonthLoaded,
    dataLoading,
    getMonthExpenseTotal,
  } = useExpenses();
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
      className="relative overflow-hidden px-4 pb-5 pt-2"
    >
      <View className="absolute -bottom-10 -left-8 h-20 w-[65%] rotate-[5deg] rounded-[100%] bg-white/10" />
      <View className="absolute -bottom-12 right-[-30px] h-20 w-[72%] -rotate-[6deg] rounded-[100%] bg-white/10" />
      <View
        className={`flex-row items-center ${isCompact ? "gap-1.5" : "gap-3"}`}
      >
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/15"
          onPress={openDrawer}
          activeOpacity={0.7}
          accessibilityLabel="Open menu"
        >
          <Feather name="menu" size={20} color="#fff" />
        </TouchableOpacity>
        <Text
          className="min-w-0 flex-1 font-inter-bold text-[18px] tracking-[0.1px] text-white"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          Expenses
        </Text>
        <View className="h-9 shrink-0 flex-row items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/20 px-3 shadow-sm shadow-black/20">
          <Text className="font-inter-medium text-[9px] tracking-wide text-white/80">
            EXPENSES
          </Text>
          <Text
            className="font-inter-bold text-[12px] text-white"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            ৳{formatExpenseAmount(monthTotal) || "0"}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};
