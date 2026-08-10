import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NotificationBell } from "@/components/NotificationBell";

interface MealsHeaderProps {
  backgroundColor: string;
  isAdmin: boolean;
  onMenu: () => void;
  onAddConsumer: () => void;
}

export const MealsHeader = ({
  backgroundColor,
  isAdmin,
  onMenu,
  onAddConsumer,
}: MealsHeaderProps) => (
  <View style={[styles.header, { backgroundColor }]}>
    <TouchableOpacity
      style={styles.iconButton}
      onPress={onMenu}
      activeOpacity={0.7}
      accessibilityLabel="Open menu"
    >
      <Feather name="menu" size={22} color="#fff" />
    </TouchableOpacity>
    <Text style={styles.title}>Meal Tracker</Text>
    <NotificationBell />
    {isAdmin ? (
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAddConsumer}
        accessibilityLabel="Add consumer"
      >
        <Feather name="user-plus" size={20} color="#fff" />
      </TouchableOpacity>
    ) : (
      <View style={styles.viewOnlyBadge}>
        <Text style={styles.viewOnlyText}>View{"\n"}Only</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 15,
    gap: 8,
    borderRadius: 22,
    shadowColor: "#0F766E",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewOnlyBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewOnlyText: {
    color: "#fff",
    fontSize: 7,
    lineHeight: 8,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
