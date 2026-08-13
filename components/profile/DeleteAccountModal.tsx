import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useOtpTimer } from "@/hooks/useOtpTimer";

type DeleteMethod = "password" | "otp";

const styles = StyleSheet.create({
  activeMethod: {
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#CBD5E1",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
  },
  inactiveMethod: {
    backgroundColor: "transparent",
    elevation: 0,
  },
});

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DeleteAccountModal = ({
  visible,
  onClose,
}: DeleteAccountModalProps) => {
  const {
    user,
    deleteAccount,
    requestAccountDeletionOtp,
    deleteAccountWithOtp,
  } = useAuth();
  const [method, setMethod] = useState<DeleteMethod>("password");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { secondsRemaining, startTimer, resetTimer } = useOtpTimer(60);

  useEffect(() => {
    if (!visible) {
      setMethod("password");
      setPassword("");
      setShowPassword(false);
      setOtp("");
      setOtpSent(false);
      setLoading(false);
      setError("");
      resetTimer();
    }
  }, [resetTimer, visible]);

  const close = () => {
    if (!loading) onClose();
  };

  const selectMethod = (nextMethod: DeleteMethod) => {
    if (loading) return;
    setMethod(nextMethod);
    setError("");
  };

  const requestOtp = async () => {
    setLoading(true);
    setError("");
    try {
      await requestAccountDeletionOtp();
      setOtpSent(true);
      setOtp("");
      startTimer();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to send the verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmDeletion = async () => {
    setLoading(true);
    setError("");
    try {
      if (method === "password") await deleteAccount(password);
      else await deleteAccountWithOtp(otp);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to delete your account. Please try again.",
      );
      setLoading(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-center bg-black/55 px-5"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Feather name="alert-triangle" size={23} color="#DC2626" />
            </View>
            <Text className="font-inter-bold text-[22px] text-slate-900">
              Delete your account?
            </Text>
            <Text className="mt-2 font-inter text-sm leading-[21px] text-slate-600">
              Your login and personal information will be permanently deleted.
              Your existing member name and mess history remain marked as
              Account deleted, so balances do not change.
            </Text>

            <View className="mt-5 flex-row rounded-xl bg-slate-100 p-1">
              <TouchableOpacity
                className="h-10 flex-1 items-center justify-center rounded-lg"
                style={
                  method === "password"
                    ? styles.activeMethod
                    : styles.inactiveMethod
                }
                onPress={() => selectMethod("password")}
              >
                <Text
                  className={`font-inter-semibold text-sm ${method === "password" ? "text-slate-900" : "text-slate-500"}`}
                >
                  Use Password
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="h-10 flex-1 items-center justify-center rounded-lg"
                style={
                  method === "otp" ? styles.activeMethod : styles.inactiveMethod
                }
                onPress={() => selectMethod("otp")}
              >
                <Text
                  className={`font-inter-semibold text-sm ${method === "otp" ? "text-slate-900" : "text-slate-500"}`}
                >
                  Use Email OTP
                </Text>
              </TouchableOpacity>
            </View>

            {method === "password" ? (
              <View key="password-method" className="mt-5">
                <Text className="mb-2 font-inter-semibold text-sm text-slate-700">
                  Enter your password
                </Text>
                <View
                  className={`h-[52px] flex-row items-center rounded-xl border bg-slate-50 px-3.5 ${error ? "border-red-300" : "border-slate-200"}`}
                >
                  <TextInput
                    className="flex-1 font-inter text-[15px] text-slate-900"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      setError("");
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    className="p-1.5"
                    onPress={() => setShowPassword((current) => !current)}
                    disabled={loading}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View key="otp-method" className="mt-5">
                <Text className="font-inter-semibold text-sm text-slate-700">
                  Verification email
                </Text>
                <Text className="mt-1 font-inter text-xs text-slate-500">
                  {user?.email ?? "Your account email"}
                </Text>
                {!otpSent ? (
                  <TouchableOpacity
                    key="send-deletion-otp"
                    className={`mt-3 h-[50px] items-center justify-center rounded-xl bg-teal-700 ${loading ? "opacity-50" : "opacity-100"}`}
                    onPress={() => void requestOtp()}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="font-inter-bold text-sm text-white">
                        Send verification code
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View key="enter-deletion-otp">
                    <TextInput
                      className={`mt-3 h-16 rounded-xl border-2 bg-slate-50 text-center font-inter-bold text-[28px] tracking-[10px] text-slate-900 ${error ? "border-red-300" : "border-teal-700"}`}
                      value={otp}
                      onChangeText={(value) => {
                        setOtp(value.replace(/\D/g, "").slice(0, 6));
                        setError("");
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="••••••"
                      placeholderTextColor="#CBD5E1"
                      editable={!loading}
                    />
                    <TouchableOpacity
                      className="mt-2 items-center py-2"
                      onPress={() => void requestOtp()}
                      disabled={loading || secondsRemaining > 0}
                    >
                      <Text
                        className={`font-inter-semibold text-xs ${secondsRemaining > 0 ? "text-slate-400" : "text-teal-700"}`}
                      >
                        {secondsRemaining > 0
                          ? `Resend code in ${secondsRemaining}s`
                          : "Resend verification code"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {error ? (
              <Text className="mt-2 font-inter text-xs leading-[18px] text-red-600">
                {error}
              </Text>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                className="h-[50px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white"
                onPress={close}
                disabled={loading}
              >
                <Text className="font-inter-semibold text-sm text-slate-700">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`h-[50px] flex-1 items-center justify-center rounded-xl bg-red-600 ${loading || (method === "password" ? !password : !otpSent || otp.length !== 6) ? "opacity-50" : "opacity-100"}`}
                onPress={() => void confirmDeletion()}
                disabled={
                  loading ||
                  (method === "password"
                    ? !password
                    : !otpSent || otp.length !== 6)
                }
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-inter-bold text-sm text-white">
                    Delete permanently
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            <Text className="mt-4 font-inter text-[11px] leading-[17px] text-amber-700">
              If you are the only admin of a mess, add another admin first.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
