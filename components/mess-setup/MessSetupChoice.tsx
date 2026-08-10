import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import type { MessSetupMode } from "@/types/messSetup";
import { messSetupStyles as styles } from "./messSetupStyles";

interface ChoiceCardProps {
  mode: MessSetupMode;
  onChoose: (mode: MessSetupMode) => void;
}

const ChoiceCard = ({ mode, onChoose }: ChoiceCardProps) => {
  const isCreate = mode === "create";

  return (
    <TouchableOpacity style={styles.optionCard} onPress={() => onChoose(mode)}>
      <View
        style={[
          styles.optionIcon,
          { backgroundColor: isCreate ? "#ECFDF5" : "#EFF6FF" },
        ]}
      >
        <Feather
          name={isCreate ? "plus-circle" : "log-in"}
          size={28}
          color={isCreate ? "#0F766E" : "#3B82F6"}
        />
      </View>
      <Text style={styles.optionTitle}>
        {isCreate ? "Create a Mess" : "Join a Mess"}
      </Text>
      <Text style={styles.optionDescription}>
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
  <View style={styles.choiceGrid}>
    <ChoiceCard mode="create" onChoose={onChoose} />
    <ChoiceCard mode="join" onChoose={onChoose} />
  </View>
);
