import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";
import { getProfileAvatarColor, getProfileInitials } from "@/utils/profile";
import { profileStyles as styles } from "./profileStyles";

interface ProfileHeaderProps {
  name: string;
  email: string;
  isAdmin: boolean;
  backgroundColor: string;
  onBack: () => void;
}

export const ProfileHeader = ({
  name,
  email,
  isAdmin,
  backgroundColor,
  onBack,
}: ProfileHeaderProps) => (
  <View style={[styles.header, { backgroundColor }]}>
    <TouchableOpacity
      style={styles.backButton}
      onPress={onBack}
      activeOpacity={0.7}
      accessibilityLabel="Go back"
    >
      <Feather name="arrow-left" size={22} color="#fff" />
    </TouchableOpacity>
    <View
      style={[styles.avatar, { backgroundColor: getProfileAvatarColor(name) }]}
    >
      <Text style={styles.avatarText}>{getProfileInitials(name)}</Text>
    </View>
    <View style={styles.headerInfo}>
      <Text style={styles.headerName}>{name}</Text>
      <Text style={styles.headerEmail}>{email}</Text>
    </View>
    <View
      style={[
        styles.roleBadge,
        {
          backgroundColor: isAdmin
            ? "rgba(255,255,255,0.25)"
            : "rgba(255,255,255,0.15)",
        },
      ]}
    >
      <Text style={styles.roleBadgeText}>{isAdmin ? "Admin" : "Member"}</Text>
    </View>
  </View>
);
