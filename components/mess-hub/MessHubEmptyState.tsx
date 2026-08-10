import Feather from "@expo/vector-icons/Feather";
import { Text, View } from "react-native";
import { messHubStyles as styles } from "./messHubStyles";

export const MessHubEmptyState = () => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIcon}>
      <Feather name="home" size={36} color="#9CA3AF" />
    </View>
    <Text style={styles.emptyTitle}>No messes yet</Text>
    <Text style={styles.emptyDescription}>
      Create a new mess or join an existing one using a mess key.
    </Text>
  </View>
);
