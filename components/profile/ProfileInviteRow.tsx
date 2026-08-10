import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { useColors } from "@/hooks/useColors";
import { profileStyles as styles } from "./profileStyles";

interface ProfileInviteRowProps {
  expanded: boolean;
  email: string;
  sending: boolean;
  error: string;
  sent: boolean;
  colors: ReturnType<typeof useColors>;
  onOpen: () => void;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
}

export const ProfileInviteRow = ({
  expanded,
  email,
  sending,
  error,
  sent,
  colors,
  onOpen,
  onClose,
  onEmailChange,
  onSubmit,
}: ProfileInviteRowProps) => {
  if (!expanded) {
    return (
      <View
        style={[
          styles.rowItem,
          styles.rowDivider,
          { borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.rowIconWrapper, styles.inviteIconWrapper]}>
          <Feather name="send" size={16} color="#3B82F6" />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
            Invite Member
          </Text>
          <Text style={[styles.rowValue, { color: colors.foreground }]}>
            Send join key via email
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.actionButton, styles.inviteButton]}
          onPress={onOpen}
          activeOpacity={0.7}
        >
          <Feather name="send" size={15} color="#3B82F6" />
          <Text style={[styles.actionButtonText, styles.inviteButtonText]}>
            Invite
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.rowDivider, { borderBottomColor: colors.border }]}>
      <View style={styles.rowItem}>
        <View style={[styles.rowIconWrapper, styles.inviteIconWrapper]}>
          <Feather name="send" size={16} color="#3B82F6" />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
            Invite Email
          </Text>
          <TextInput
            autoFocus
            value={email}
            onChangeText={onEmailChange}
            onSubmitEditing={onSubmit}
            placeholder="someone@example.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="send"
            style={[
              styles.editInput,
              { color: colors.foreground, borderBottomColor: "#3B82F6" },
            ]}
            editable={!sending}
          />
        </View>
        <View style={styles.editActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.secondary }]}
            onPress={onClose}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: sent ? "#059669" : "#3B82F6" },
            ]}
            onPress={onSubmit}
            disabled={sending || sent}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size={14} color="#fff" />
            ) : (
              <Feather name={sent ? "check" : "send"} size={14} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {sent && <Text style={styles.successText}>Invite sent!</Text>}
    </View>
  );
};
