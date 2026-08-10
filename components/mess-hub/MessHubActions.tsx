import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { messHubStyles as styles } from "./messHubStyles";

interface MessHubActionsProps {
  onCreate: () => void;
  onJoin: () => void;
}

interface ActionCardProps {
  icon: "plus-circle" | "log-in";
  iconColor: string;
  iconBackground: string;
  title: string;
  description: string;
  onPress: () => void;
}

const ActionCard = ({
  icon,
  iconColor,
  iconBackground,
  title,
  description,
  onPress,
}: ActionCardProps) => (
  <TouchableOpacity
    style={styles.actionCard}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[styles.actionIcon, { backgroundColor: iconBackground }]}>
      <Feather name={icon} size={24} color={iconColor} />
    </View>
    <View style={styles.actionText}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
    </View>
    <Feather name="chevron-right" size={18} color="#9CA3AF" />
  </TouchableOpacity>
);

export const MessHubActions = ({ onCreate, onJoin }: MessHubActionsProps) => (
  <View style={styles.actionsSection}>
    <Text style={styles.sectionTitle}>ADD A MESS</Text>
    <ActionCard
      icon="plus-circle"
      iconColor="#0F766E"
      iconBackground="#ECFDF5"
      title="Create a New Mess"
      description="Start a mess and become its admin"
      onPress={onCreate}
    />
    <ActionCard
      icon="log-in"
      iconColor="#3B82F6"
      iconBackground="#EFF6FF"
      title="Join a Mess"
      description="Enter a mess key to request access"
      onPress={onJoin}
    />
  </View>
);
