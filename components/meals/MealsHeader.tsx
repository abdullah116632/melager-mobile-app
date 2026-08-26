import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/redux/hooks";
import { useDrawer } from "@/redux/hooks";
import { useMess } from "@/redux/hooks";
import { AddMealConsumerModal } from "./AddMealConsumerModal";

export const MealsHeader = () => {
  const { role } = useAuth();
  const { openDrawer } = useDrawer();
  const { currentYearMonth, currentMonthLoaded, dataLoading, getGrandTotal } =
    useMess();
  const [showAddConsumer, setShowAddConsumer] = useState(false);
  const isAdmin = role === "admin";
  const totalMeals =
    currentMonthLoaded && !dataLoading ? getGrandTotal(currentYearMonth) : 0;

  return (
    <>
      <LinearGradient
        colors={["#075F5B", "#00796F", "#019D83"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="relative overflow-hidden px-4 pb-5 pt-2"
      >
        <View className="absolute -bottom-10 -left-8 h-20 w-[65%] rotate-[5deg] rounded-[100%] bg-white/10" />
        <View className="absolute -bottom-12 right-[-30px] h-20 w-[72%] -rotate-[6deg] rounded-[100%] bg-white/10" />
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            className="h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-white/10 bg-white/15"
            onPress={openDrawer}
            activeOpacity={0.7}
            accessibilityLabel="Open menu"
          >
            <Feather name="menu" size={21} color="#fff" />
          </TouchableOpacity>
          <View className="h-[40px] w-[40px] items-center justify-center rounded-full border-2 border-white bg-emerald-50 shadow-lg shadow-black/20">
            <Feather name="coffee" size={19} color="#047857" />
          </View>
          <Text
            className="flex-1 font-inter-bold text-[18px] tracking-[0.1px] text-white"
            numberOfLines={1}
          >
            Meals
          </Text>
          <NotificationBell badgeBorderColor="#00796F" />
          <View className="items-center rounded-full border border-white/20 bg-white/15 px-2.5 py-1.5">
            <Text className="font-inter text-[8px] leading-[9px] text-white/75">
              TOTAL
            </Text>
            <Text className="font-inter-bold text-[12px] leading-[14px] text-white">
              {totalMeals.toLocaleString("en-IN", {
                maximumFractionDigits: 3,
              })}
            </Text>
          </View>
          {isAdmin ? (
            <TouchableOpacity
              className="h-[38px] w-[38px] items-center justify-center rounded-[11px] border border-white/10 bg-white/15"
              onPress={() => setShowAddConsumer(true)}
              activeOpacity={0.75}
              accessibilityLabel="Add consumer"
            >
              <Feather name="user-plus" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
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
      <AddMealConsumerModal
        visible={showAddConsumer}
        onClose={() => setShowAddConsumer(false)}
      />
    </>
  );
};
