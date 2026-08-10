import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { NotificationBell } from "@/components/NotificationBell";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import { formatDepositAmount } from "@/utils/deposit";
import { depositStyles as styles } from "./depositStyles";

interface DepositsHeaderProps {
  grandTotal: number;
  isAdmin: boolean;
  onMenu: () => void;
  onAddConsumer: () => void;
}

export const DepositsHeader = ({
  grandTotal,
  isAdmin,
  onMenu,
  onAddConsumer,
}: DepositsHeaderProps) => (
  <View style={[styles.pageHeader, { backgroundColor: DEPOSIT_PRIMARY }]}>
    <TouchableOpacity
      style={styles.menuButton}
      onPress={onMenu}
      activeOpacity={0.7}
    >
      <Feather name="menu" size={22} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.pageTitle}>Deposit Tracker</Text>
    <View style={styles.headerRight}>
      <NotificationBell badgeBorderColor="#7C3AED" />
      <View style={styles.totalBadge}>
        <Text style={styles.totalBadgeText}>
          ৳{formatDepositAmount(grandTotal)}
        </Text>
      </View>
      {isAdmin ? (
        <TouchableOpacity style={styles.addButton} onPress={onAddConsumer}>
          <Feather name="user-plus" size={20} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={styles.viewOnlyBadge}>
          <Text style={styles.viewOnlyText}>View{"\n"}Only</Text>
        </View>
      )}
    </View>
  </View>
);
