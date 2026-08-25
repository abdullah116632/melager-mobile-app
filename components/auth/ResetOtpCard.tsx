import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useOtpTimer } from "@/hooks/useOtpTimer";
import { resendPasswordResetCode } from "@/services/authService";
import {
  clearPendingPasswordReset,
  savePendingPasswordReset,
} from "@/services/pendingPasswordResetService";
import { BackRow, ErrorBox, ResendRow } from "./AuthFeedback";
import { OtpField } from "./OtpField";

interface ResetOtpCardProps {
  pendingEmail: string;
  startTimerOnMount: boolean;
  onBack: () => void;
  onVerified: (otp: string) => void;
}

export const ResetOtpCard = ({
  pendingEmail,
  startTimerOnMount,
  onBack,
  onVerified,
}: ResetOtpCardProps) => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const { secondsRemaining, startTimer } = useOtpTimer();
  const disabled = otp.length !== 6;

  useEffect(() => {
    if (startTimerOnMount) startTimer();
  }, [startTimer, startTimerOnMount]);

  const changeOtp = (value: string) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  const verify = () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError("");
    void clearPendingPasswordReset();
    onVerified(otp);
  };

  const resend = async () => {
    if (secondsRemaining > 0) return;

    setError("");
    try {
      await resendPasswordResetCode(pendingEmail);
      await savePendingPasswordReset({
        email: pendingEmail,
        requestedAt: Date.now(),
      });
      startTimer();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to resend code",
      );
    }
  };

  const back = () => {
    void clearPendingPasswordReset();
    onBack();
  };

  return (
    <View className="rounded-3xl bg-white p-[26px] shadow-2xl shadow-black/20">
      <BackRow onPress={back} label="Back" />
      <View className="mb-[18px] h-[68px] w-[68px] items-center justify-center self-center rounded-full border-[1.5px] border-teal-100 bg-orange-50">
        <Feather name="mail" size={28} color="#EA580C" />
      </View>
      <Text className="mb-2 text-center font-inter-bold text-[21px] text-gray-900">
        Check your email
      </Text>
      <Text className="mb-6 text-center font-inter text-sm leading-[22px] text-gray-500">
        We sent a 6-digit reset code to{`\n`}
        <Text className="font-inter-semibold text-gray-900">
          {pendingEmail}
        </Text>
      </Text>
      <OtpField label="Reset Code" otp={otp} onChangeText={changeOtp} />
      <ErrorBox error={error} />
      <TouchableOpacity
        className={`mt-1.5 h-[54px] items-center justify-center rounded-[14px] bg-teal-700 ${disabled ? "opacity-50 shadow-none" : "opacity-100 shadow-lg shadow-teal-700/35"}`}
        onPress={verify}
        disabled={disabled}
      >
        <Text className="font-inter-bold text-base tracking-[0.2px] text-white">
          Verify Code
        </Text>
      </TouchableOpacity>
      <ResendRow
        onResend={() => void resend()}
        resendTimer={secondsRemaining}
      />
    </View>
  );
};
