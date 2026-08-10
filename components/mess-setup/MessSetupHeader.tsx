import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { messSetupStyles as styles } from "./messSetupStyles";

interface MessSetupHeaderProps {
  firstName?: string;
  onBack: () => void;
}

export const MessSetupHeader = ({
  firstName,
  onBack,
}: MessSetupHeaderProps) => (
  <>
    <TouchableOpacity style={styles.backButton} onPress={onBack}>
      <Feather name="arrow-left" size={20} color="rgba(255,255,255,0.85)" />
      <Text style={styles.backText}>Back to Hub</Text>
    </TouchableOpacity>

    <View style={styles.header}>
      <View style={styles.logoCircle}>
        <Feather name="coffee" size={30} color="#0F766E" />
      </View>
      <Text style={styles.greeting}>Hi, {firstName ?? "there"}!</Text>
      <Text style={styles.subtitle}>Add another mess</Text>
    </View>
  </>
);
