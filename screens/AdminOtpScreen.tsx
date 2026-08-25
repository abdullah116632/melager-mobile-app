import { useCallback, useEffect, useState } from "react";
import Feather from "@expo/vector-icons/Feather";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  OtpField,
  ResendRow,
  SecurityErrorBox,
  SecuritySubmitButton,
  SecuritySuccessCard,
} from "@/components/settings/SecurityFormControls";
import { useAuth } from "@/redux/hooks";
import { useOtpTimer } from "@/hooks/useOtpTimer";
import {
  clearPendingAdminOtp,
  getPendingAdminOtp,
  savePendingAdminOtp,
} from "@/services/pendingAdminOtpService";
import {
  changeSecurityPassword,
  confirmAdminTransfer,
  confirmCoAdmin,
  confirmSelfAdminRemoval,
  resendSecurityOtp,
  updateSecurityEmail,
} from "@/services/securityService";
import type { AdminOtpAction, PendingAdminOtpFlow } from "@/types/security";

const actionContent: Record<
  AdminOtpAction,
  {
    title: string;
    description: (memberName?: string) => string;
    submitLabel: string;
    successTitle: string;
    successBody: string;
    accent: string;
    icon: "lock" | "at-sign" | "shield" | "user-check" | "user-minus";
  }
> = {
  change_password: {
    title: "Confirm Password Change",
    description: () =>
      "Enter the code sent to your email to confirm your new password.",
    submitLabel: "Change Password",
    successTitle: "Password Changed!",
    successBody: "Your account password has been updated successfully.",
    accent: "#0F766E",
    icon: "lock",
  },
  update_email: {
    title: "Confirm Email Change",
    description: () =>
      "Enter the code sent to your current email to confirm the change.",
    submitLabel: "Verify & Update Email",
    successTitle: "Email Updated!",
    successBody: "Your login email has been updated successfully.",
    accent: "#0D9488",
    icon: "at-sign",
  },
  add_admin: {
    title: "Confirm Admin Transfer",
    description: (memberName) =>
      `Enter the code sent to your email to transfer the admin role${memberName ? ` to ${memberName}` : ""}.`,
    submitLabel: "Confirm Transfer",
    successTitle: "Admin Transferred!",
    successBody:
      "The selected member is now the primary admin. You are now a regular member.",
    accent: "#EA580C",
    icon: "shield",
  },
  add_co_admin: {
    title: "Confirm New Admin",
    description: (memberName) =>
      `Enter the code sent to your email to grant admin access${memberName ? ` to ${memberName}` : ""}.`,
    submitLabel: "Confirm & Grant Admin",
    successTitle: "Admin Added!",
    successBody:
      "The selected member now has admin privileges. Your privileges are unchanged.",
    accent: "#2563EB",
    icon: "user-check",
  },
  remove_self_admin: {
    title: "Verify Role Removal",
    description: () =>
      "Enter the code sent to your email to remove your admin privileges.",
    submitLabel: "Remove My Admin Role",
    successTitle: "Admin Role Removed",
    successBody: "You are now a regular member of this mess.",
    accent: "#DC2626",
    icon: "user-minus",
  },
};

export const AdminOtpScreen = () => {
  const router = useRouter();
  const { token, user, refreshMe, patchUser } = useAuth();
  const [flow, setFlow] = useState<PendingAdminOtpFlow | null>(null);
  const [loadingFlow, setLoadingFlow] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const { secondsRemaining, startTimer } = useOtpTimer();

  useEffect(() => {
    let cancelled = false;

    void getPendingAdminOtp().then(async (pendingFlow) => {
      if (cancelled) return;
      if (!pendingFlow || pendingFlow.userId !== user?.id) {
        if (pendingFlow) await clearPendingAdminOtp();
        router.replace("/settings/security");
        return;
      }
      setFlow(pendingFlow);
      setLoadingFlow(false);
      startTimer();
    });

    return () => {
      cancelled = true;
    };
  }, [router, startTimer, user?.id]);

  const returnToSecurity = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/settings/security");
    }
  }, [router]);

  const leavePage = useCallback(async () => {
    await clearPendingAdminOtp();
    returnToSecurity();
  }, [returnToSecurity]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        void leavePage();
        return true;
      },
    );
    return () => subscription.remove();
  }, [leavePage]);

  const verifyCode = async () => {
    if (!flow || otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      if (flow.action === "change_password") {
        await changeSecurityPassword(token, otp);
      } else if (flow.action === "update_email") {
        const data = await updateSecurityEmail(token, otp);
        patchUser({ email: data.newEmail });
      } else if (flow.action === "add_admin") {
        await confirmAdminTransfer(token, otp);
      } else if (flow.action === "add_co_admin") {
        await confirmCoAdmin(token, otp);
      } else {
        await confirmSelfAdminRemoval(token, otp);
      }
      await clearPendingAdminOtp();
      setSuccess(true);
      if (flow.action === "add_admin" || flow.action === "remove_self_admin") {
        void refreshMe().catch(() => undefined);
      }
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Verification failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!flow || secondsRemaining > 0) return;

    setError("");
    try {
      await resendSecurityOtp(token, flow.action);
      const refreshedFlow = { ...flow, requestedAt: Date.now() };
      await savePendingAdminOtp(refreshedFlow);
      setFlow(refreshedFlow);
      startTimer();
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Failed to resend code",
      );
    }
  };

  const finish = returnToSecurity;
  const content = flow ? actionContent[flow.action] : null;

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0F766E", "#115E59", "#0B413D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className={`px-4 pb-5 ${Platform.OS === "android" ? "pt-safe-offset-3" : "pt-safe-offset-2"}`}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => void leavePage()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10"
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="ml-3 flex-1">
            <Text className="font-inter-bold text-xl text-white">
              Email Verification
            </Text>
            <Text className="mt-0.5 font-inter text-xs text-teal-100/75">
              This page stays open while you check your email
            </Text>
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Feather name="mail" size={19} color="#CCFBF1" />
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center p-5 pb-safe-offset-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-300/40">
            {loadingFlow || !content ? (
              <View className="items-center py-16">
                <ActivityIndicator size="large" color="#0F766E" />
              </View>
            ) : success ? (
              <SecuritySuccessCard
                icon="check-circle"
                iconClassName="bg-green-50"
                iconColor="#16A34A"
                title={content.successTitle}
                body={
                  flow?.action === "update_email" && flow.email
                    ? `Your login email has been changed to\n${flow.email}`
                    : content.successBody
                }
                onClose={finish}
              />
            ) : (
              <>
                <View className="mb-5 h-20 w-20 items-center justify-center self-center rounded-full bg-slate-50">
                  <Feather
                    name={content.icon}
                    size={34}
                    color={content.accent}
                  />
                </View>
                <Text className="mb-2 text-center font-inter-bold text-[22px] text-slate-900">
                  {content.title}
                </Text>
                <Text className="mb-6 text-center font-inter text-sm leading-[22px] text-slate-500">
                  {content.description(flow?.memberName)}
                </Text>
                <Text className="mb-2 font-inter-semibold text-[13px] text-slate-700">
                  Verification Code
                </Text>
                <OtpField
                  value={otp}
                  onChange={setOtp}
                  onClearError={() => setError("")}
                />
                <SecurityErrorBox message={error} />
                <SecuritySubmitButton
                  loading={submitting}
                  disabled={otp.length !== 6}
                  label={content.submitLabel}
                  onPress={() => void verifyCode()}
                />
                <ResendRow
                  secondsRemaining={secondsRemaining}
                  onResend={() => void resendCode()}
                />
                <View className="mt-5 flex-row items-start gap-2 rounded-xl bg-teal-50 px-3.5 py-3">
                  <Feather name="info" size={14} color="#0F766E" />
                  <Text className="flex-1 font-inter text-xs leading-[18px] text-teal-800">
                    You can leave the app to check your mailbox. This page will
                    remain available when you return.
                  </Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
