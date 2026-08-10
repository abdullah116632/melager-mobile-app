import { Text, TextInput, View } from "react-native";

import { authStyles as styles } from "./authStyles";

type OtpFieldProps = {
  label: string;
  otp: string;
  onChangeText: (value: string) => void;
};

export const OtpField = ({ label, otp, onChangeText }: OtpFieldProps) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.otpInput}
      value={otp}
      onChangeText={onChangeText}
      keyboardType="number-pad"
      maxLength={6}
      placeholder="• • • • • •"
      placeholderTextColor="#CBD5E1"
      textAlign="center"
      autoFocus
    />
  </View>
);
