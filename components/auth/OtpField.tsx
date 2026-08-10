import { Text, TextInput, View } from "react-native";

type OtpFieldProps = {
  label: string;
  otp: string;
  onChangeText: (value: string) => void;
};

export const OtpField = ({ label, otp, onChangeText }: OtpFieldProps) => (
  <View className="mb-[18px]">
    <Text className="mb-[7px] font-inter-semibold text-[13px] text-gray-700">
      {label}
    </Text>
    <TextInput
      className="h-[68px] rounded-[14px] border-2 border-teal-700 bg-teal-50 text-center font-inter-bold text-[30px] tracking-[12px] text-gray-900"
      value={otp}
      onChangeText={onChangeText}
      keyboardType="number-pad"
      maxLength={6}
      placeholder="• • • • • •"
      placeholderTextColor="#CBD5E1"
      autoFocus
    />
  </View>
);
