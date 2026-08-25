import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { requestPasswordReset } from "@/services/authService";
import { savePendingPasswordReset } from "@/services/pendingPasswordResetService";
import { BackRow, ErrorBox } from "./AuthFeedback";

interface ForgotPasswordCardProps {
  initialEmail: string;
  onBack: (email: string) => void;
  onCodeRequested: (pendingEmail: string, enteredEmail: string) => void;
}

export const ForgotPasswordCard = ({
  initialEmail,
  onBack,
  onCodeRequested,
}: ForgotPasswordCardProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const data = await requestPasswordReset(email.trim());
      await savePendingPasswordReset({
        email: data.pendingEmail,
        requestedAt: Date.now(),
      });
      onCodeRequested(data.pendingEmail, email);
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="rounded-3xl bg-white p-[26px] shadow-2xl shadow-black/20">
      <BackRow onPress={() => onBack(email)} label="Back to Login" />
      <View className="mb-[18px] h-[68px] w-[68px] items-center justify-center self-center rounded-full border-[1.5px] border-teal-100 bg-teal-50">
        <Feather name="lock" size={28} color="#0F766E" />
      </View>
      <Text className="mb-2 text-center font-inter-bold text-[21px] text-gray-900">
        Forgot Password?
      </Text>
      <Text className="mb-6 text-center font-inter text-sm leading-[22px] text-gray-500">
        Enter your registered email and we&apos;ll send you a reset code.
      </Text>
      <View className="mb-[18px]">
        <TextInput
          className="h-[50px] rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF] px-[15px] font-inter text-[15px] text-gray-900"
          placeholder="Enter your email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
      </View>
      <ErrorBox error={error} />
      <TouchableOpacity
        className={`mt-1.5 h-[54px] items-center justify-center rounded-[14px] bg-teal-700 ${loading ? "opacity-50 shadow-none" : "opacity-100 shadow-lg shadow-teal-700/35"}`}
        onPress={() => void submit()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-inter-bold text-base tracking-[0.2px] text-white">
            Send Reset Code
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
