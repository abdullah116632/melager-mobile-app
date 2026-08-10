import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { dashboardStyles as styles } from "./dashboardStyles";

export const DashboardSummaryButton = ({
  sending,
  onPress,
}: {
  sending: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.summaryButton, { opacity: sending ? 0.6 : 1 }]}
    onPress={onPress}
    disabled={sending}
    activeOpacity={0.8}
  >
    {sending ? (
      <ActivityIndicator size={16} color="#fff" />
    ) : (
      <Feather name="send" size={16} color="#fff" />
    )}
    <Text style={styles.summaryButtonText}>
      {sending ? "Sending…" : "Email Monthly Summary to Members"}
    </Text>
  </TouchableOpacity>
);
