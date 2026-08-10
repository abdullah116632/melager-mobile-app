import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { authStyles as styles } from "./authStyles";
import { BackRow, ErrorBox, ResendRow } from "./AuthFeedback";
import { OtpField } from "./OtpField";

type SignupOtpCardProps = {
  pendingEmail: string;
  otp: string;
  error: string;
  loading: boolean;
  resendTimer: number;
  onBack: () => void;
  onOtpChange: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
};

export const SignupOtpCard = ({
  pendingEmail,
  otp,
  error,
  loading,
  resendTimer,
  onBack,
  onOtpChange,
  onVerify,
  onResend,
}: SignupOtpCardProps) => (
  <View style={styles.card}>
    <BackRow onPress={onBack} label="Back" />
    <View style={styles.iconCircle}>
      <Feather name="mail" size={28} color="#0F766E" />
    </View>
    <Text style={styles.cardTitle}>Check your email</Text>
    <Text style={styles.subtitle}>
      We sent a 6-digit code to{`\n`}
      <Text style={styles.highlightEmail}>{pendingEmail}</Text>
    </Text>
    <OtpField label="Verification Code" otp={otp} onChangeText={onOtpChange} />
    <ErrorBox error={error} />
    <TouchableOpacity
      style={[
        styles.submitBtn,
        (loading || otp.length !== 6) && styles.submitBtnDisabled,
      ]}
      onPress={onVerify}
      disabled={loading || otp.length !== 6}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.submitBtnText}>Verify & Create Account</Text>
      )}
    </TouchableOpacity>
    <ResendRow onResend={onResend} resendTimer={resendTimer} />
  </View>
);
