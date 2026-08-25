import { useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import {
  SecurityErrorBox,
  SecuritySubmitButton,
} from "@/components/settings/SecurityFormControls";
import { useAuth } from "@/redux/hooks";
import { savePendingAdminOtp } from "@/services/pendingAdminOtpService";
import { requestSecurityOtp } from "@/services/securityService";

interface LeaveAdminRoleFormProps {
  onClose: () => void;
}

export const LeaveAdminRoleForm = ({ onClose }: LeaveAdminRoleFormProps) => {
  const router = useRouter();
  const { token, user, activeMess } = useAuth();
  const messId = activeMess?.id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestCode = async () => {
    if (!messId || !user) {
      setError("No active mess selected.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await requestSecurityOtp(token, {
        action: "remove_self_admin",
        messId,
      });
      await savePendingAdminOtp({
        action: "remove_self_admin",
        userId: user.id,
        messId,
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
      <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-red-50">
        <Feather name="user-minus" size={28} color="#DC2626" />
      </View>
      <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
        Remove My Admin Role
      </Text>
      <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
        You will remain in {activeMess?.name ?? "this mess"} as a regular
        member, but you will no longer be able to manage it.
      </Text>
      <View className="mb-4 flex-row items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3">
        <Feather name="shield" size={14} color="#92400E" />
        <Text className="flex-1 font-inter-medium text-xs leading-[18px] text-amber-800">
          A mess must always have at least one admin. If you are the only admin,
          add another admin first.
        </Text>
      </View>
      <View className="flex-row items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3">
        <Feather name="alert-triangle" size={14} color="#B91C1C" />
        <Text className="flex-1 font-inter-medium text-xs leading-[18px] text-red-700">
          This action requires email verification and removes your admin access.
        </Text>
      </View>
      <SecurityErrorBox message={error} />
      <SecuritySubmitButton
        loading={loading}
        onPress={() => void requestCode()}
        label="Send Verification Code"
      />
    </>
  );
};
