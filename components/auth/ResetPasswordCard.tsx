import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { submitPasswordReset } from "@/services/authService";
import { clearPendingPasswordReset } from "@/services/pendingPasswordResetService";
import type { ResetPasswordDraft } from "@/types/auth";
import { BackRow, ErrorBox } from "./AuthFeedback";

interface ResetPasswordCardProps {
  pendingEmail: string;
  otp: string;
  initialDraft: ResetPasswordDraft;
  onBack: (draft: ResetPasswordDraft) => void;
  onResetComplete: (email: string, draft: ResetPasswordDraft) => void;
}

const inputClassName =
  "h-[50px] rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF] px-[15px] font-inter text-[15px] text-gray-900";

export const ResetPasswordCard = ({
  pendingEmail,
  otp,
  initialDraft,
  onBack,
  onResetComplete,
}: ResetPasswordCardProps) => {
  const [newPassword, setNewPassword] = useState(initialDraft.newPassword);
  const [confirmPassword, setConfirmPassword] = useState(
    initialDraft.confirmPassword,
  );
  const [showPassword, setShowPassword] = useState(initialDraft.showPassword);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getDraft = (): ResetPasswordDraft => ({
    newPassword,
    confirmPassword,
    showPassword,
  });

  const submit = async () => {
    if (!newPassword.trim()) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await submitPasswordReset(pendingEmail, otp, newPassword);
      await clearPendingPasswordReset();
      onResetComplete(pendingEmail, getDraft());
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Reset failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="rounded-3xl bg-white p-[26px] shadow-2xl shadow-black/20">
      <BackRow onPress={() => onBack(getDraft())} label="Back" />
      <View className="mb-[18px] h-[68px] w-[68px] items-center justify-center self-center rounded-full border-[1.5px] border-teal-100 bg-orange-50">
        <Feather name="key" size={28} color="#EA580C" />
      </View>
      <Text className="mb-2 text-center font-inter-bold text-[21px] text-gray-900">
        Set New Password
      </Text>
      <Text className="mb-6 text-center font-inter text-sm leading-[22px] text-gray-500">
        Choose a new password for your account.
      </Text>
      <View className="mb-[18px]">
        <View className="flex-row items-center gap-2">
          <TextInput
            className={`${inputClassName} flex-1`}
            placeholder="Enter new password"
            placeholderTextColor="#9CA3AF"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            returnKeyType="next"
            autoFocus
          />
          <TouchableOpacity
            className="h-[50px] w-[50px] items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF]"
            onPress={() => setShowPassword((value) => !value)}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
      </View>
      <View className="mb-[18px]">
        <TextInput
          className={inputClassName}
          placeholder="Confirm new password"
          placeholderTextColor="#9CA3AF"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
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
            Reset Password
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
