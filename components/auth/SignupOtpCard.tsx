import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useOtpTimer } from "@/hooks/useOtpTimer";
import { useAuth } from "@/redux/hooks";
import {
  clearPendingSignupOtp,
  savePendingSignupOtp,
} from "@/services/pendingSignupOtpService";
import { BackRow, ErrorBox, ResendRow } from "./AuthFeedback";
import { OtpField } from "./OtpField";

interface SignupOtpCardProps {
  pendingEmail: string;
  onBack: () => void;
}

export const SignupOtpCard = ({ pendingEmail, onBack }: SignupOtpCardProps) => {
  const { verifyOtp, resendOtp } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { secondsRemaining, startTimer } = useOtpTimer();
  const disabled = loading || otp.length !== 6;

  useEffect(() => {
    startTimer();
  }, [startTimer]);

  const changeOtp = (value: string) => {
    setOtp(value.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  const verify = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await verifyOtp(pendingEmail, otp);
      await clearPendingSignupOtp();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (secondsRemaining > 0) return;

    setError("");
    try {
      await resendOtp(pendingEmail);
      await savePendingSignupOtp({
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
    void clearPendingSignupOtp();
    onBack();
  };

  return (
    <View className="rounded-3xl bg-white p-[26px] shadow-2xl shadow-black/20">
      <BackRow onPress={back} label="Back" />
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
      <OtpField label="Verification Code" otp={otp} onChangeText={changeOtp} />
      <ErrorBox error={error} />
      <TouchableOpacity
        className={`mt-1.5 h-[54px] items-center justify-center rounded-[14px] bg-teal-700 ${disabled ? "opacity-50 shadow-none" : "opacity-100 shadow-lg shadow-teal-700/35"}`}
        onPress={() => void verify()}
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
      <ResendRow
        onResend={() => void resend()}
        resendTimer={secondsRemaining}
      />
    </View>
  );
};
