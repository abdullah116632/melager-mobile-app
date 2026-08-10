import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import type { AppColors } from "@/types/theme";
import { memberRequestStyles as styles } from "./memberRequestStyles";

interface MemberRequestsHeaderProps {
  colors: AppColors;
  onBack: () => void;
  onRefresh: () => void;
}

export const MemberRequestsHeader = ({
  colors,
  onBack,
  onRefresh,
}: MemberRequestsHeaderProps) => (
  <View style={[styles.header, { backgroundColor: colors.primary }]}>
    <TouchableOpacity
      style={styles.backButton}
      onPress={onBack}
      activeOpacity={0.7}
    >
      <Feather name="arrow-left" size={22} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Member Requests</Text>
    <TouchableOpacity
      style={styles.refreshButton}
      onPress={onRefresh}
      activeOpacity={0.7}
    >
      <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />
    </TouchableOpacity>
  </View>
);
