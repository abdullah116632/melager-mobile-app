import { useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import {
  SecurityErrorBox,
  SecuritySubmitButton,
} from "@/components/settings/SecurityFormControls";
import { useAuth } from "@/redux/hooks";
import { savePendingAdminOtp } from "@/services/pendingAdminOtpService";
import { requestSecurityOtp } from "@/services/securityService";

interface ChangePasswordFormProps {
  onClose: () => void;
}

export const ChangePasswordForm = ({ onClose }: ChangePasswordFormProps) => {
  const router = useRouter();
  const { token, user, activeMess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const sendCode = async () => {
    if (!user || !activeMess) {
      setError("No active mess selected.");
      return;
    }
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await requestSecurityOtp(token, {
        action: "change_password",
        currentPassword,
        newPassword,
      });
      await savePendingAdminOtp({
        action: "change_password",
        userId: user.id,
        messId: activeMess.id,
        requestedAt: Date.now(),
      });
      onClose();
      router.push("/settings/admin-otp");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-teal-50">
        <Feather name="lock" size={28} color="#0F766E" />
      </View>
      <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
        Change Password
      </Text>
      <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
        First verify your identity, then we&apos;ll send a code to your email to
        confirm.
      </Text>
      <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
        Current Password
      </Text>
      <View className="flex-row gap-2">
        <TextInput
          className="h-12 flex-1 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
          placeholder="Enter current password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showCurrentPassword}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          returnKeyType="next"
          autoFocus
        />
        <TouchableOpacity
          className="h-12 w-12 items-center justify-center rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50"
          onPress={() => setShowCurrentPassword((visible) => !visible)}
          accessibilityRole="button"
          accessibilityLabel={
            showCurrentPassword
              ? "Hide current password"
              : "Show current password"
          }
        >
          <Feather
            name={showCurrentPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
      <Text className="mb-1.5 mt-3.5 font-inter-semibold text-[13px] text-gray-700">
        New Password
      </Text>
      <View className="flex-row gap-2">
        <TextInput
          className="h-12 flex-1 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
          placeholder="Min. 6 characters"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showNewPassword}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TouchableOpacity
          className="h-12 w-12 items-center justify-center rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50"
          onPress={() => setShowNewPassword((visible) => !visible)}
        >
          <Feather
            name={showNewPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
      <Text className="mb-1.5 mt-3.5 font-inter-semibold text-[13px] text-gray-700">
        Confirm New Password
      </Text>
      <TextInput
        className="h-12 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
        placeholder="Re-enter new password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry={!showNewPassword}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        returnKeyType="done"
        onSubmitEditing={() => void sendCode()}
      />
      <SecurityErrorBox message={error} />
      <SecuritySubmitButton
        loading={loading}
        onPress={() => void sendCode()}
        label="Send Verification Code"
      />
    </>
  );
};
