import { useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Text, TextInput, View } from "react-native";

import {
  SecurityErrorBox,
  SecuritySubmitButton,
} from "@/components/settings/SecurityFormControls";
import { useAuth } from "@/context/AuthContext";
import { savePendingAdminOtp } from "@/services/pendingAdminOtpService";
import { requestSecurityOtp } from "@/services/securityService";

interface UpdateEmailFormProps {
  onClose: () => void;
}

export const UpdateEmailForm = ({ onClose }: UpdateEmailFormProps) => {
  const router = useRouter();
  const { token, user, activeMess } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  const sendCode = async () => {
    if (!user || !activeMess) {
      setError("No active mess selected.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter a new email address.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await requestSecurityOtp(token, {
        action: "update_email",
        payload: email.trim(),
      });
      await savePendingAdminOtp({
        action: "update_email",
        userId: user.id,
        messId: activeMess.id,
        email: email.trim(),
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
        <Feather name="at-sign" size={28} color="#0D9488" />
      </View>
      <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
        Update Email
      </Text>
      <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
        Enter your new email. We&apos;ll send a code to your current email to
        verify the change.
      </Text>
      <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
        New Email Address
      </Text>
      <TextInput
        className="h-12 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
        placeholder="new@example.com"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        returnKeyType="done"
        onSubmitEditing={() => void sendCode()}
        autoFocus
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
