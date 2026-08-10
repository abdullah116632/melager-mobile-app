import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { MESS_ROLE_BADGE_COLORS } from "@/constants/messHub";
import type { MessHubMess } from "@/types/messHub";
import { messHubStyles as styles } from "./messHubStyles";

interface MessCardProps {
  mess: MessHubMess;
  onEnter: (mess: MessHubMess) => void;
}

export const MessCard = ({ mess, onEnter }: MessCardProps) => {
  const badgeColors = MESS_ROLE_BADGE_COLORS[mess.role];

  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.messIconCircle}>
          <Feather name="home" size={20} color="#0F766E" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.messName} numberOfLines={1}>
            {mess.name}
          </Text>
          <View style={styles.badgeDetails}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: badgeColors.background,
                  borderColor: badgeColors.border,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: badgeColors.text }]}>
                {mess.role === "admin" ? "Admin" : "Member"}
              </Text>
            </View>
            {mess.role === "admin" && (
              <Text style={styles.messKey}>
                <Feather name="key" size={10} color="#9CA3AF" /> {mess.messKey}
              </Text>
            )}
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.enterButton}
        onPress={() => onEnter(mess)}
        activeOpacity={0.8}
      >
        <Text style={styles.enterButtonText}>Enter</Text>
        <Feather name="arrow-right" size={15} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};
