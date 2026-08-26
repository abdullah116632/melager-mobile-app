import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/redux/hooks";
import type { MessHubMess } from "@/types/messHub";

interface MessCardProps {
  mess: MessHubMess;
}

export const MessCard = ({ mess }: MessCardProps) => {
  const { mess: activeMess, selectMess } = useAuth();
  const isAdmin = mess.role === "admin";
  const isEntering = activeMess?.id === mess.id;
  const messSelectionInProgress = activeMess !== null;

  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm shadow-black/[0.06]">
      <View className="flex-1 flex-row items-center gap-3">
        <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-emerald-50">
          <Feather name="home" size={20} color="#0F766E" />
        </View>
        <View className="flex-1 gap-[5px]">
          <Text
            className="font-inter-semibold text-[15px] text-gray-900"
            numberOfLines={1}
          >
            {mess.name}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            <View
              className={`self-start rounded-md border px-2 py-[3px] ${isAdmin ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"}`}
            >
              <Text
                className={`font-inter-semibold text-[11px] ${isAdmin ? "text-emerald-800" : "text-blue-800"}`}
              >
                {isAdmin ? "Admin" : "Member"}
              </Text>
            </View>
            {isAdmin && (
              <Text className="font-inter text-[11px] tracking-[1px] text-gray-400">
                <Feather name="key" size={10} color="#9CA3AF" /> {mess.messKey}
              </Text>
            )}
          </View>
        </View>
      </View>
      <TouchableOpacity
        className={`min-w-[78px] flex-row items-center justify-center gap-[5px] rounded-[10px] bg-teal-700 px-3.5 py-[9px] ${messSelectionInProgress && !isEntering ? "opacity-55" : "opacity-100"}`}
        onPress={() => selectMess(mess)}
        disabled={messSelectionInProgress}
        activeOpacity={0.8}
        accessibilityLabel={
          isEntering ? `Entering ${mess.name}` : `Enter ${mess.name}`
        }
      >
        {isEntering ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Text className="font-inter-semibold text-[13px] text-white">
              Enter
            </Text>
            <Feather name="arrow-right" size={15} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
