import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

import { authStyles as styles } from "./authStyles";
import { BackRow, ErrorBox, ResendRow } from "./AuthFeedback";
import { OtpField } from "./OtpField";

type ResetOtpCardProps = {
  pendingEmail: string;
  otp: string;
  error: string;
  resendTimer: number;
  onBack: () => void;
  onOtpChange: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
};

export const ResetOtpCard = ({
  pendingEmail,
  otp,
  error,
  resendTimer,
  onBack,
  onOtpChange,
  onVerify,
  onResend,
}: ResetOtpCardProps) => (
  <View style={styles.card}>
    <BackRow onPress={onBack} label="Back" />
    <View style={[styles.iconCircle, styles.resetIconCircle]}>
      <Feather name="mail" size={28} color="#EA580C" />
    </View>
    <Text style={styles.cardTitle}>Check your email</Text>
    <Text style={styles.subtitle}>
      We sent a 6-digit reset code to{`\n`}
      <Text style={styles.highlightEmail}>{pendingEmail}</Text>
    </Text>
    <OtpField label="Reset Code" otp={otp} onChangeText={onOtpChange} />
    <ErrorBox error={error} />
    <TouchableOpacity
      style={[styles.submitBtn, otp.length !== 6 && styles.submitBtnDisabled]}
      onPress={onVerify}
      disabled={otp.length !== 6}
    >
      <Text style={styles.submitBtnText}>Verify Code</Text>
    </TouchableOpacity>
    <ResendRow onResend={onResend} resendTimer={resendTimer} />
  </View>
);
