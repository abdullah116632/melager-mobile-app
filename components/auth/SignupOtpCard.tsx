import Feather from "@expo/vector-icons/Feather";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

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
}: SignupOtpCardProps) => {
  const disabled = loading || otp.length !== 6;

  return (
    <View className="rounded-3xl bg-white p-[26px] shadow-2xl shadow-black/20">
      <BackRow onPress={onBack} label="Back" />
      <View className="mb-[18px] h-[68px] w-[68px] items-center justify-center self-center rounded-full border-[1.5px] border-teal-100 bg-teal-50">
        <Feather name="mail" size={28} color="#0F766E" />
      </View>
      <Text className="mb-2 text-center font-inter-bold text-[21px] text-gray-900">
        Check your email
      </Text>
      <Text className="mb-6 text-center font-inter text-sm leading-[22px] text-gray-500">
        We sent a 6-digit code to{`\n`}
        <Text className="font-inter-semibold text-gray-900">
          {pendingEmail}
        </Text>
      </Text>
      <OtpField
        label="Verification Code"
        otp={otp}
        onChangeText={onOtpChange}
      />
      <ErrorBox error={error} />
      <TouchableOpacity
        className={`mt-1.5 h-[54px] items-center justify-center rounded-[14px] bg-teal-700 ${disabled ? "opacity-50 shadow-none" : "opacity-100 shadow-lg shadow-teal-700/35"}`}
        onPress={onVerify}
        disabled={disabled}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-inter-bold text-base tracking-[0.2px] text-white">
            Verify & Create Account
          </Text>
        )}
      </TouchableOpacity>
      <ResendRow onResend={onResend} resendTimer={resendTimer} />
    </View>
  );
};
