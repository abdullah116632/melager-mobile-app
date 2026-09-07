import { useEffect, useState } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SecurityErrorBox,
  SecuritySuccessCard,
} from "@/components/settings/SecurityFormControls";
import { useKeyboardSheetOffset } from "@/hooks/useKeyboardSheetOffset";
import { clearApiCache } from "@/lib/api";
import { useAuth } from "@/redux/hooks";
import { saveOpenForgotPasswordIntent } from "@/services/pendingForgotPasswordIntentService";
import {
  GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE,
  loadGoogleSignInModule,
} from "@/services/googleSignInService";
import { removeSelfAdminV2 } from "@/services/securityService";

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

interface LeaveAdminRoleFormProps {
  visible: boolean;
  onClose: () => void;
}

export const LeaveAdminRoleForm = ({
  visible,
  onClose,
}: LeaveAdminRoleFormProps) => {
  const router = useRouter();
  const { token, activeMess, refreshMe, logout } = useAuth();
  const messId = activeMess?.id;
  const androidKeyboardOffset = useKeyboardSheetOffset();
  const [step, setStep] = useState<"identity" | "success">("identity");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setStep("identity");
      setPassword("");
      setShowPassword(false);
      setLoading(false);
      setError("");
    }
  }, [visible]);

  const close = () => {
    if (!loading) onClose();
  };

  // Losing the manager role invalidates this whole screen (it's gated on
  // being a manager), so leaving it showing stale "you're still a manager"
  // options after success would be wrong — send the user back to the
  // dashboard instead of just closing the modal in place.
  const finishRemoval = () => {
    onClose();
    router.replace("/(tabs)/dashboard");
  };

  const removeAdmin = async () => {
    if (!messId) {
      setError("No active mess selected.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await removeSelfAdminV2(token, { messId, password });
      // removeSelfAdminV2 goes through securityService's own fetch, not
      // lib/api.ts's req(), so it never clears that module's 15s GET cache —
      // without this, refreshMe()'s /auth/me call can still serve a
      // pre-removal cached response. Clear it, then await the refresh, so
      // the dashboard/tab bar (driven by activeMess.role) already reflects
      // the demoted role by the time the user leaves this screen.
      clearApiCache();
      await refreshMe().catch(() => undefined);
      setStep("success");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to remove your manager role.",
      );
      setLoading(false);
    }
  };

  const removeAdminWithGoogle = async () => {
    if (!messId) {
      setError("No active mess selected.");
      return;
    }
    if (!googleWebClientId) {
      setError("Google sign-in is not configured yet.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const googleSignInModule = await loadGoogleSignInModule();
      if (!googleSignInModule) {
        setError(GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE);
        return;
      }
      const { GoogleSignin, isSuccessResponse } = googleSignInModule;
      GoogleSignin.configure({ webClientId: googleWebClientId });
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return;
      if (!response.data.idToken) {
        setError("Google did not return a sign-in token. Please try again.");
        return;
      }
      await removeSelfAdminV2(token, {
        messId,
        googleIdToken: response.data.idToken,
      });
      await refreshMe().catch(() => undefined);
      setStep("success");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(
        message.includes("RNGoogleSignin")
          ? GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE
          : "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const goToForgotPassword = async () => {
    await saveOpenForgotPasswordIntent();
    onClose();
    await logout();
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        className="flex-1 justify-center bg-black/55 px-5"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ paddingBottom: androidKeyboardOffset }}
      >
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={close}
        />
        <View className="max-h-[92%] rounded-[24px] bg-white shadow-2xl shadow-black/30">
          <ScrollView
            contentContainerClassName="p-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === "success" ? (
              <SecuritySuccessCard
                icon="check-circle"
                iconClassName="bg-green-50"
                iconColor="#16A34A"
                title="Manager Role Removed"
                body="You are now a regular member of this mess."
                onClose={finishRemoval}
              />
            ) : (
              <>
                <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-red-50">
                  <Feather name="user-minus" size={28} color="#DC2626" />
                </View>
                <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
                  Confirm Your Identity
                </Text>
                <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
                  Verify it&apos;s you to remove your manager role from{" "}
                  {activeMess?.name ?? "this mess"}.
                </Text>

                <Text className="mb-1.5 font-inter-semibold text-[13px] text-gray-700">
                  Password
                </Text>
                <View className="flex-row gap-2">
                  <TextInput
                    className="h-12 flex-1 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 px-3.5 font-inter text-[15px] text-gray-900"
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      setError("");
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={() => void removeAdmin()}
                  />
                  <TouchableOpacity
                    className="h-12 w-12 items-center justify-center rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50"
                    onPress={() => setShowPassword((visibleState) => !visibleState)}
                    disabled={loading}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  className="mb-4 mt-3 self-start"
                  onPress={() => void goToForgotPassword()}
                  disabled={loading}
                >
                  <Text className="font-inter-semibold text-[13px] text-teal-700">
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`h-[52px] flex-row items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-gray-200 bg-white ${loading ? "opacity-50" : "opacity-100"}`}
                  onPress={() => void removeAdminWithGoogle()}
                  disabled={loading}
                >
                  <AntDesign name="google" size={18} color="#EA4335" />
                  <Text className="font-inter-semibold text-[15px] text-gray-700">
                    Verify with Google
                  </Text>
                </TouchableOpacity>

                <SecurityErrorBox message={error} />

                <View className="mb-4 mt-2 flex-row items-start gap-2 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3">
                  <Feather name="shield" size={14} color="#92400E" />
                  <Text className="flex-1 font-inter-medium text-xs leading-[18px] text-amber-800">
                    A mess must always have at least one manager. If you are
                    the only manager, add another manager first.
                  </Text>
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="h-[52px] flex-1 items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-white"
                    onPress={close}
                    disabled={loading}
                  >
                    <Text className="font-inter-semibold text-base text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`h-[52px] flex-1 items-center justify-center rounded-xl bg-red-600 ${loading || !password ? "opacity-50" : "opacity-100"}`}
                    onPress={() => void removeAdmin()}
                    disabled={loading || !password}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="font-inter-bold text-base text-white">
                        Confirm Remove
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
