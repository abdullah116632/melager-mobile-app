import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { NotificationBell } from "@/components/NotificationBell";
import type { AppColors } from "@/types/theme";
import { dashboardStyles as styles } from "./dashboardStyles";

interface DashboardHeaderProps {
  colors: AppColors;
  messName?: string;
  messKey?: string;
  keyCopied: boolean;
  onMenu: () => void;
  onCopyKey: () => void;
}

export const DashboardHeader = ({
  colors,
  messName,
  messKey,
  keyCopied,
  onMenu,
  onCopyKey,
}: DashboardHeaderProps) => (
  <View style={[styles.pageHeader, { backgroundColor: colors.primary }]}>
    <TouchableOpacity
      style={styles.menuButton}
      onPress={onMenu}
      activeOpacity={0.7}
    >
      <Feather name="menu" size={22} color="#fff" />
    </TouchableOpacity>
    <View style={styles.flex}>
      <Text style={styles.pageTitle}>Dashboard</Text>
      {messName ? <Text style={styles.messName}>{messName}</Text> : null}
    </View>
    <NotificationBell />
    <TouchableOpacity
      style={styles.keyBadge}
      onPress={onCopyKey}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel="Copy mess key"
    >
      <Feather name="key" size={12} color="rgba(255,255,255,0.7)" />
      <Text style={styles.keyText}>{messKey ?? "——"}</Text>
      <Feather
        name={keyCopied ? "check" : "copy"}
        size={13}
        color={keyCopied ? "#A7F3D0" : "rgba(255,255,255,0.78)"}
      />
    </TouchableOpacity>
  </View>
);
