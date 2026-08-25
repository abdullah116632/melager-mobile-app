import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { useAuth } from "@/redux/hooks";
import {
  clearPendingAdminOtp,
  getPendingAdminOtp,
} from "@/services/pendingAdminOtpService";
import type { PendingAdminOtpFlow } from "@/types/security";
import { AdminOtpHeader } from "./AdminOtpHeader";
import { AdminOtpVerificationCard } from "./AdminOtpVerificationCard";

export const AdminOtpContent = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [flow, setFlow] = useState<PendingAdminOtpFlow | null>(null);
  const [loadingFlow, setLoadingFlow] = useState(true);

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
    });

    return () => {
      cancelled = true;
    };
  }, [router, user?.id]);

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

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="light" />
      <AdminOtpHeader onBack={() => void leavePage()} />
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
            {loadingFlow || !flow ? (
              <View className="items-center py-16">
                <ActivityIndicator size="large" color="#0F766E" />
              </View>
            ) : (
              <AdminOtpVerificationCard
                flow={flow}
                onFinish={returnToSecurity}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
