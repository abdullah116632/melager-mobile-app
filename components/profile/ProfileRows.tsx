import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { useColors } from "@/hooks/useColors";
import { profileStyles as styles } from "./profileStyles";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface ProfileRowProps {
  icon: FeatherIconName;
  label: string;
  value: string;
  valueColor?: string;
  colors: ReturnType<typeof useColors>;
  showDivider?: boolean;
}

export const ProfileRow = ({
  icon,
  label,
  value,
  valueColor,
  colors,
  showDivider,
}: ProfileRowProps) => (
  <View
    style={[
      styles.rowItem,
      showDivider && styles.rowDivider,
      showDivider && { borderBottomColor: colors.border },
    ]}
  >
    <View
      style={[styles.rowIconWrapper, { backgroundColor: colors.secondary }]}
    >
      <Feather name={icon} size={16} color={colors.primary} />
    </View>
    <View style={styles.rowContent}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.rowValue, { color: valueColor ?? colors.foreground }]}
      >
        {value}
      </Text>
    </View>
  </View>
);

interface ProfileEditableRowProps extends ProfileRowProps {
  onEdit?: () => void;
}

export const ProfileEditableRow = ({
  icon,
  label,
  value,
  valueColor,
  colors,
  showDivider,
  onEdit,
}: ProfileEditableRowProps) => (
  <View
    style={[
      styles.rowItem,
      showDivider && styles.rowDivider,
      showDivider && { borderBottomColor: colors.border },
    ]}
  >
    <View
      style={[styles.rowIconWrapper, { backgroundColor: colors.secondary }]}
    >
      <Feather name={icon} size={16} color={colors.primary} />
    </View>
    <View style={styles.rowContent}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.rowValue, { color: valueColor ?? colors.foreground }]}
      >
        {value}
      </Text>
    </View>
    {onEdit && (
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.secondary }]}
        onPress={onEdit}
        activeOpacity={0.7}
        hitSlop={8}
      >
        <Feather name="edit-2" size={14} color={colors.primary} />
        <Text style={[styles.actionButtonText, { color: colors.primary }]}>
          Edit
        </Text>
      </TouchableOpacity>
    )}
  </View>
);

interface ProfileEditRowProps {
  icon: FeatherIconName;
  label: string;
  value: string;
  saving: boolean;
  error: string;
  colors: ReturnType<typeof useColors>;
  showDivider?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const ProfileEditRow = ({
  icon,
  label,
  value,
  saving,
  error,
  colors,
  showDivider,
  onChange,
  onSave,
  onCancel,
}: ProfileEditRowProps) => (
  <View
    style={[
      showDivider && styles.rowDivider,
      showDivider && { borderBottomColor: colors.border },
    ]}
  >
    <View style={styles.rowItem}>
      <View
        style={[styles.rowIconWrapper, { backgroundColor: colors.secondary }]}
      >
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <TextInput
          autoFocus
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSave}
          returnKeyType="done"
          style={[
            styles.editInput,
            {
              color: colors.foreground,
              borderBottomColor: colors.primary,
            },
          ]}
          maxLength={100}
          editable={!saving}
        />
      </View>
      <View style={styles.editActions}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.secondary }]}
          onPress={onCancel}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Feather name="x" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.primary }]}
          onPress={onSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size={14} color="#fff" />
          ) : (
            <Feather name="check" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
    {!!error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);
