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

type ForgotPasswordCardProps = {
  email: string;
  error: string;
  loading: boolean;
  onBack: () => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
};

export const ForgotPasswordCard = ({
  email,
  error,
  loading,
  onBack,
  onEmailChange,
  onSubmit,
}: ForgotPasswordCardProps) => (
  <View style={styles.card}>
    <BackRow onPress={onBack} label="Back to Login" />
    <View style={styles.iconCircle}>
      <Feather name="lock" size={28} color="#0F766E" />
    </View>
    <Text style={styles.cardTitle}>Forgot Password?</Text>
    <Text style={styles.subtitle}>
      Enter your registered email and we&apos;ll send you a reset code.
    </Text>
    <View style={styles.field}>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={onEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
        autoFocus
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
        <Text style={styles.submitBtnText}>Send Reset Code</Text>
      )}
    </TouchableOpacity>
  </View>
);
