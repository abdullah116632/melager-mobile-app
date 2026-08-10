import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { authStyles as styles } from "./authStyles";
import { BackRow, ErrorBox } from "./AuthFeedback";

type ResetPasswordCardProps = {
  newPassword: string;
  confirmPassword: string;
  showNewPassword: boolean;
  error: string;
  loading: boolean;
  onBack: () => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
};

export const ResetPasswordCard = ({
  newPassword,
  confirmPassword,
  showNewPassword,
  error,
  loading,
  onBack,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onTogglePassword,
  onSubmit,
}: ResetPasswordCardProps) => (
  <View style={styles.card}>
    <BackRow onPress={onBack} label="Back" />
    <View style={[styles.iconCircle, styles.resetIconCircle]}>
      <Feather name="key" size={28} color="#EA580C" />
    </View>
    <Text style={styles.cardTitle}>Set New Password</Text>
    <Text style={styles.subtitle}>Choose a new password for your account.</Text>
    <View style={styles.field}>
      <Text style={styles.label}>New Password</Text>
      <View style={styles.passwordRow}>
        <TextInput
          style={[styles.input, styles.flexibleInput]}
          placeholder="Min. 6 characters"
          placeholderTextColor="#9CA3AF"
          value={newPassword}
          onChangeText={onNewPasswordChange}
          secureTextEntry={!showNewPassword}
          returnKeyType="next"
          autoFocus
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={onTogglePassword}>
          <Feather
            name={showNewPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
    </View>
    <View style={styles.field}>
      <Text style={styles.label}>Confirm New Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Re-enter new password"
        placeholderTextColor="#9CA3AF"
        value={confirmPassword}
        onChangeText={onConfirmPasswordChange}
        secureTextEntry={!showNewPassword}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
    </View>
    <ErrorBox error={error} />
    <TouchableOpacity
      style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
      onPress={onSubmit}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.submitBtnText}>Reset Password</Text>
      )}
    </TouchableOpacity>
  </View>
);
