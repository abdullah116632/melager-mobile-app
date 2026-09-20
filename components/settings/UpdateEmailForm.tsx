import { useState } from "react";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import {
  SecurityErrorBox,
  SecuritySubmitButton,
} from "@/components/settings/SecurityFormControls";
import { useAuth } from "@/redux/hooks";
import {
  GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE,
  loadGoogleSignInModule,
} from "@/services/googleSignInService";
import { savePendingAdminOtp } from "@/services/pendingAdminOtpService";
import { saveOpenForgotPasswordIntent } from "@/services/pendingForgotPasswordIntentService";
import {
  requestEmailChangeV2,
  verifyIdentityV2,
} from "@/services/securityService";

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

interface UpdateEmailFormProps {
  onClose: () => void;
}

/**
 * Two steps: prove who is asking, then claim the new address. The code goes
 * to the new address and the account keeps its current email until that code
 * is confirmed on the OTP screen.
 */
export const UpdateEmailForm = ({ onClose }: UpdateEmailFormProps) => {
  const router = useRouter();
  const { token, user, activeMess, logout } = useAuth();
  const [step, setStep] = useState<"identity" | "email">("identity");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Held only in memory between the two steps; the request below proves the
  // caller again, so nothing is trusted from the first step alone.
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const verifyPassword = async () => {
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await verifyIdentityV2(token, { password });
      setGoogleIdToken(null);
      setStep("email");
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyWithGoogle = async () => {
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
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return;
      if (!response.data.idToken) {
        setError("Google did not return a sign-in token. Please try again.");
        return;
      }
      await verifyIdentityV2(token, { googleIdToken: response.data.idToken });
      setGoogleIdToken(response.data.idToken);
      setPassword("");
      setStep("email");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(
        message.includes("RNGoogleSignin")
          ? GOOGLE_SIGN_IN_BUILD_REQUIRED_MESSAGE
          : message || "Verification failed. Please try again.",
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

  const sendCode = async () => {
    if (!user || !activeMess) {
      setError("No active mess selected.");
      return;
    }
    const newEmail = email.trim();
    if (!newEmail) {
      setError("Please enter a new email address.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await requestEmailChangeV2(token, {
        newEmail,
        ...(googleIdToken ? { googleIdToken } : { password }),
      });
      await savePendingAdminOtp({
        action: "update_email",
        userId: user.id,
        messId: activeMess.id,
        email: newEmail,
        otpTarget: "new_email",
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

  if (step === "identity") {
    return (
      <>
        <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-teal-50">
          <Feather name="lock" size={28} color="#0D9488" />
        </View>
        <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
          Confirm Your Identity
        </Text>
        <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
          Enter your password to continue. You&apos;ll choose the new email on
          the next step.
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
            onSubmitEditing={() => void verifyPassword()}
            autoFocus
          />
          <TouchableOpacity
            className="h-12 w-12 items-center justify-center rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50"
            onPress={() => setShowPassword((visible) => !visible)}
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
          onPress={() => void verifyWithGoogle()}
          disabled={loading}
        >
          <AntDesign name="google" size={18} color="#EA4335" />
          <Text className="font-inter-semibold text-[15px] text-gray-700">
            Verify with Google
          </Text>
        </TouchableOpacity>
        <SecurityErrorBox message={error} />
        <SecuritySubmitButton
          loading={loading}
          disabled={!password}
          onPress={() => void verifyPassword()}
          label="Continue"
        />
      </>
    );
  }

  return (
    <>
      <View className="mb-4 h-16 w-16 items-center justify-center self-center rounded-full bg-teal-50">
        <Feather name="at-sign" size={28} color="#0D9488" />
      </View>
      <Text className="mb-1.5 text-center font-inter-bold text-xl text-gray-900">
        Update Email
      </Text>
      <Text className="mb-5 text-center font-inter text-sm leading-[22px] text-gray-500">
        Enter your new email. We&apos;ll send a code to that address, and your
        current email stays in use until you verify it.
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
        autoCorrect={false}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError("");
        }}
        editable={!loading}
        returnKeyType="done"
        onSubmitEditing={() => void sendCode()}
        autoFocus
      />
      <SecurityErrorBox message={error} />
      <SecuritySubmitButton
        loading={loading}
        disabled={!email.trim()}
        onPress={() => void sendCode()}
        label="Send Verification Code"
      />
      <TouchableOpacity
        className="mt-3 h-[52px] items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-white"
        onPress={() => {
          setError("");
          setStep("identity");
        }}
        disabled={loading}
      >
        <Text className="font-inter-semibold text-base text-gray-700">
          Back
        </Text>
      </TouchableOpacity>
    </>
  );
};
