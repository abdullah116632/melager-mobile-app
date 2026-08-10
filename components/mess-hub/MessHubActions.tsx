import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

interface MessHubActionsProps {
  onCreate: () => void;
  onJoin: () => void;
}

interface ActionCardProps {
  icon: "plus-circle" | "log-in";
  iconColor: string;
  iconContainerClassName: string;
  title: string;
  description: string;
  onPress: () => void;
}

const ActionCard = ({
  icon,
  iconColor,
  iconContainerClassName,
  title,
  description,
  onPress,
}: ActionCardProps) => (
  <TouchableOpacity
    className="flex-row items-center gap-3.5 rounded-2xl bg-white p-4 shadow-sm shadow-black/[0.06]"
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View
      className={`h-12 w-12 items-center justify-center rounded-[14px] ${iconContainerClassName}`}
    >
      <Feather name={icon} size={24} color={iconColor} />
    </View>
    <View className="flex-1">
      <Text className="mb-0.5 font-inter-semibold text-[15px] text-gray-900">
        {title}
      </Text>
      <Text className="font-inter text-xs text-gray-500">{description}</Text>
    </View>
    <Feather name="chevron-right" size={18} color="#9CA3AF" />
  </TouchableOpacity>
);

export const MessHubActions = ({ onCreate, onJoin }: MessHubActionsProps) => (
  <View className="mt-2 gap-2.5">
    <Text className="mb-1 px-0.5 font-inter-semibold text-[11px] tracking-[0.8px] text-gray-500">
      ADD A MESS
    </Text>
    <ActionCard
      icon="plus-circle"
      iconColor="#0F766E"
      iconContainerClassName="bg-emerald-50"
      title="Create a New Mess"
      description="Start a mess and become its admin"
      onPress={onCreate}
    />
    <ActionCard
      icon="log-in"
      iconColor="#3B82F6"
      iconContainerClassName="bg-blue-50"
      title="Join a Mess"
      description="Enter a mess key to request access"
      onPress={onJoin}
    />
  </View>
);
