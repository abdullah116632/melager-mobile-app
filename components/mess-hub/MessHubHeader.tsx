import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { messHubStyles as styles } from "./messHubStyles";

interface MessHubHeaderProps {
  topPadding: number;
  firstName?: string;
  loading: boolean;
  onLogout: () => void;
}

export const MessHubHeader = ({
  topPadding,
  firstName,
  loading,
  onLogout,
}: MessHubHeaderProps) => (
  <View style={[styles.header, { paddingTop: topPadding + 20 }]}>
    <View pointerEvents="none" style={styles.headerDecorationLarge} />
    <View pointerEvents="none" style={styles.headerDecorationSmall} />
    <View style={styles.headerRow}>
      <View style={styles.logoCircle}>
        <Feather name="coffee" size={22} color="#0F766E" />
      </View>
      <View style={styles.headerText}>
        <Text style={styles.appTitle}>Mess Manager</Text>
        <Text style={styles.greeting}>
          Hi, {firstName ?? "there"}! {"\u{1F44B}"}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator
          size="small"
          color="rgba(255,255,255,0.7)"
          style={styles.headerLoader}
        />
      ) : (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={18} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      )}
    </View>
  </View>
);
