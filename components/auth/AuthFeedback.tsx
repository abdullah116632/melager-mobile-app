import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

import { authStyles as styles } from "./authStyles";

export const ErrorBox = ({ error }: { error: string }) => {
  if (!error) return null;

  return (
    <View style={styles.errorBox}>
      <Feather name="alert-circle" size={14} color="#DC2626" />
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );
};

export const BackRow = ({
  onPress,
  label,
}: {
  onPress: () => void;
  label: string;
}) => (
  <TouchableOpacity style={styles.backRow} onPress={onPress}>
    <Feather name="arrow-left" size={16} color="#0F766E" />
    <Text style={styles.backText}>{label}</Text>
  </TouchableOpacity>
);

export const ResendRow = ({
  onResend,
  resendTimer,
}: {
  onResend: () => void;
  resendTimer: number;
}) => (
  <TouchableOpacity
    style={styles.resendRow}
    onPress={onResend}
    disabled={resendTimer > 0}
  >
    <Text
      style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}
    >
      {resendTimer > 0
        ? `Resend code in ${resendTimer}s`
        : "Didn't receive it? Resend code"}
    </Text>
  </TouchableOpacity>
);
