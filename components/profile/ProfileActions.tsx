import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { profileStyles as styles } from "./profileStyles";

interface ProfileActionsProps {
  loggingOut: boolean;
  onSwitchMess: () => void;
  onLogout: () => void;
}

export const ProfileActions = ({
  loggingOut,
  onSwitchMess,
  onLogout,
}: ProfileActionsProps) => (
  <View style={styles.profileActions}>
    <TouchableOpacity
      style={styles.switchMessButton}
      onPress={onSwitchMess}
      activeOpacity={0.8}
    >
      <Feather name="grid" size={18} color="#0F766E" />
      <Text style={styles.switchMessText}>Switch Mess</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.logoutButton, { opacity: loggingOut ? 0.6 : 1 }]}
      onPress={onLogout}
      activeOpacity={0.8}
      disabled={loggingOut}
    >
      <Feather name="log-out" size={18} color="#fff" />
      <Text style={styles.logoutText}>
        {loggingOut ? "Logging out…" : "Log Out"}
      </Text>
    </TouchableOpacity>
  </View>
);
