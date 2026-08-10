import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { messSetupStyles as styles } from "./messSetupStyles";

export const JoinRequestSuccess = ({ onBack }: { onBack: () => void }) => (
  <View style={styles.card}>
    <View style={styles.pendingIconCircle}>
      <Feather name="check-circle" size={32} color="#059669" />
    </View>
    <Text style={styles.cardTitle}>Request Sent!</Text>
    <Text style={styles.cardDescription}>
      Your request has been sent to the admin for approval.{"\n"}
      You can check the status in the Hub.
    </Text>
    <TouchableOpacity
      style={[styles.submitButton, styles.successButton]}
      onPress={onBack}
    >
      <Feather name="home" size={18} color="#fff" />
      <Text style={styles.submitButtonText}>Back to Hub</Text>
    </TouchableOpacity>
  </View>
);
