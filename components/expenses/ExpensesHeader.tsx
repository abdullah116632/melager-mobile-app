import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { NotificationBell } from "@/components/NotificationBell";
import { EXPENSE_PRIMARY } from "@/constants/expense";
import { formatExpenseAmount } from "@/utils/expense";
import { expenseStyles as styles } from "./expenseStyles";

interface ExpensesHeaderProps {
  monthTotal: number;
  isAdmin: boolean;
  onMenu: () => void;
}

export const ExpensesHeader = ({
  monthTotal,
  isAdmin,
  onMenu,
}: ExpensesHeaderProps) => (
  <View style={[styles.pageHeader, { backgroundColor: EXPENSE_PRIMARY }]}>
    <TouchableOpacity
      style={styles.menuButton}
      onPress={onMenu}
      activeOpacity={0.7}
      accessibilityLabel="Open menu"
    >
      <Feather name="menu" size={22} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.pageTitle} numberOfLines={1}>
      Expense Tracker
    </Text>
    <NotificationBell />
    <View style={[styles.totalBadge, !isAdmin && styles.totalBadgeMember]}>
      <Text
        style={[styles.totalBadgeText, !isAdmin && styles.totalBadgeTextMember]}
      >
        ৳{formatExpenseAmount(monthTotal) || "0"}
      </Text>
    </View>
    {!isAdmin && (
      <View style={styles.viewOnlyBadge}>
        <Text style={styles.viewOnlyText}>View{"\n"}Only</Text>
      </View>
    )}
  </View>
);
