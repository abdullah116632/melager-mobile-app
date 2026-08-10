import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import type { MessSetupMode } from "@/types/messSetup";

interface ChoiceCardProps {
  mode: MessSetupMode;
  onChoose: (mode: MessSetupMode) => void;
}

const ChoiceCard = ({ mode, onChoose }: ChoiceCardProps) => {
  const isCreate = mode === "create";

  return (
    <TouchableOpacity
      className="rounded-[20px] bg-white p-[22px] shadow-lg shadow-black/10"
      onPress={() => onChoose(mode)}
    >
      <View
        className={`mb-3.5 h-[58px] w-[58px] items-center justify-center rounded-[14px] ${isCreate ? "bg-emerald-50" : "bg-blue-50"}`}
      >
        <Feather
          name={isCreate ? "plus-circle" : "log-in"}
          size={28}
          color={isCreate ? "#0F766E" : "#3B82F6"}
        />
      </View>
      <Text className="mb-1.5 font-inter-bold text-[17px] text-gray-900">
        {isCreate ? "Create a Mess" : "Join a Mess"}
      </Text>
      <Text className="font-inter text-[13px] leading-5 text-gray-500">
        {isCreate
          ? "Start a new mess. You'll be the admin and get a shareable key."
          : "Enter the mess key shared by your admin to request to join."}
      </Text>
    </TouchableOpacity>
  );
};

export const MessSetupChoice = ({
  onChoose,
}: {
  onChoose: (mode: MessSetupMode) => void;
}) => (
  <View className="gap-3.5">
    <ChoiceCard mode="create" onChoose={onChoose} />
    <ChoiceCard mode="join" onChoose={onChoose} />
  </View>
);
