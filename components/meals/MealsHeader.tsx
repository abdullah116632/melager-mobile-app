import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useAppDispatch, useAuth, useDrawer, useMeals, useNetwork } from "@/redux/hooks";
import { apiActionFailed } from "@/redux/slice/networkSlice";
import { AddMealConsumerModal } from "./AddMealConsumerModal";

export const MealsHeader = () => {
  const dispatch = useAppDispatch();
  const { role } = useAuth();
  const { isOnline } = useNetwork();
  const { openDrawer } = useDrawer();
  const { currentYearMonth, currentMonthLoaded, dataLoading, getGrandTotal } =
    useMeals();
  const { width } = useWindowDimensions();
  const [showAddConsumer, setShowAddConsumer] = useState(false);
  const isAdmin = role === "admin";
  const isCompact = width < 380;
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
        <View
          className={`flex-row items-center ${isCompact ? "gap-1.5" : "gap-2.5"}`}
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
            Meals
          </Text>
          <View className="h-9 shrink-0 flex-row items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/20 px-3 shadow-sm shadow-black/20">
            <Text className="font-inter-medium text-[9px] tracking-wide text-white/80">
              MEALS
            </Text>
            <Text
              className="font-inter-bold text-[12px] text-white"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {totalMeals.toLocaleString("en-IN", {
                maximumFractionDigits: 3,
              })}
            </Text>
          </View>
          {isAdmin ? (
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/15"
              onPress={() => {
                if (!isOnline) {
                  dispatch(
                    apiActionFailed(
                      "Adding a member requires an internet connection.",
                    ),
                  );
                  return;
                }
                setShowAddConsumer(true);
              }}
              activeOpacity={0.75}
              accessibilityLabel="Add consumer"
            >
              <Feather name="user-plus" size={20} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>
      <AddMealConsumerModal
        visible={showAddConsumer}
        onClose={() => setShowAddConsumer(false)}
      />
    </>
  );
};
