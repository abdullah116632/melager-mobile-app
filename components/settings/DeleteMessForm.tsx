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

import { SecurityErrorBox } from "@/components/settings/SecurityFormControls";
import { useKeyboardSheetOffset } from "@/hooks/useKeyboardSheetOffset";
import { useAuth } from "@/redux/hooks";
import { saveOpenForgotPasswordIntent } from "@/services/pendingForgotPasswordIntentService";
import {
  GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE,
  loadGoogleSignInModule,
} from "@/services/googleSignInService";

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

interface DeleteMessFormProps {
  visible: boolean;
  onClose: () => void;
}

export const DeleteMessForm = ({ visible, onClose }: DeleteMessFormProps) => {
  const router = useRouter();
  const { activeMess, deleteMess, deleteMessWithGoogle, logout } = useAuth();
  const androidKeyboardOffset = useKeyboardSheetOffset();
  const [step, setStep] = useState<"confirm" | "identity">("confirm");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setStep("confirm");
      setPassword("");
      setShowPassword(false);
      setLoading(false);
      setError("");
    }
  }, [visible]);

  const close = () => {
    if (!loading) onClose();
  };

  const finishDeletion = () => {
    onClose();
    router.replace("/");
  };

  const confirmDelete = async () => {
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await deleteMess(password);
      finishDeletion();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to delete the mess. Please try again.",
      );
      setLoading(false);
    }
  };

  const confirmDeleteWithGoogle = async () => {
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
      await deleteMessWithGoogle(response.data.idToken);
      finishDeletion();
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
            {step === "confirm" ? (
              <>
                <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-red-50">
                  <Feather name="trash-2" size={28} color="#DC2626" />
                </View>
                <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
                  Delete Mess?
                </Text>
                <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
                  This permanently deletes {activeMess?.name ?? "this mess"}{" "}
                  for every member.
                </Text>
                <View className="mb-5 flex-row items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3">
                  <Feather name="alert-triangle" size={14} color="#B91C1C" />
                  <Text className="flex-1 font-inter-medium text-xs leading-[18px] text-red-700">
                    Once deleted, this data cannot be recovered — all meals,
                    deposits, expenses, bazar, notices and messages for this
                    mess will be permanently erased.
                  </Text>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="h-[52px] flex-1 items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-white"
                    onPress={close}
                  >
                    <Text className="font-inter-semibold text-base text-gray-700">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="h-[52px] flex-1 items-center justify-center rounded-xl bg-red-600"
                    onPress={() => setStep("identity")}
                  >
                    <Text className="font-inter-bold text-base text-white">
                      Yes, Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-red-50">
                  <Feather name="lock" size={28} color="#DC2626" />
                </View>
                <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
                  Confirm Your Identity
                </Text>
                <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
                  Verify it&apos;s you to permanently delete{" "}
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
                    onSubmitEditing={() => void confirmDelete()}
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
                  onPress={() => void confirmDeleteWithGoogle()}
                  disabled={loading}
                >
                  <AntDesign name="google" size={18} color="#EA4335" />
                  <Text className="font-inter-semibold text-[15px] text-gray-700">
                    Verify with Google
                  </Text>
                </TouchableOpacity>

                <SecurityErrorBox message={error} />

                <View className="mt-2 flex-row gap-3">
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
                    onPress={() => void confirmDelete()}
                    disabled={loading || !password}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="font-inter-bold text-base text-white">
                        Delete Permanently
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
