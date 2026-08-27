import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@/redux/hooks";
import { savePendingSignupOtp } from "@/services/pendingSignupOtpService";
import type { AuthCredentialsDraft, AuthMode } from "@/types/auth";
import { isValidEmail } from "@/utils/email";
import { ErrorBox } from "./AuthFeedback";
import { GoogleSignInButton } from "./GoogleSignInButton";

type LoginSignupMode = Extract<AuthMode, "login" | "signup">;

interface LoginSignupCardProps {
  mode: LoginSignupMode;
  initialDraft: AuthCredentialsDraft;
  onModeChange: (mode: LoginSignupMode, draft: AuthCredentialsDraft) => void;
  onSignupPending: (pendingEmail: string, draft: AuthCredentialsDraft) => void;
  onForgotPassword: (draft: AuthCredentialsDraft) => void;
}

const inputClassName =
  "h-[50px] rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF] px-[15px] font-inter text-[15px] text-gray-900";

export const LoginSignupCard = ({
  mode,
  initialDraft,
  onModeChange,
  onSignupPending,
  onForgotPassword,
}: LoginSignupCardProps) => {
  const { login, signup } = useAuth();
  const [name, setName] = useState(initialDraft.name);
  const [email, setEmail] = useState(initialDraft.email);
  const [mobileNumber, setMobileNumber] = useState(initialDraft.mobileNumber);
  const [password, setPassword] = useState(initialDraft.password);
  const [confirmPassword, setConfirmPassword] = useState(
    initialDraft.confirmPassword,
  );
  const [showPassword, setShowPassword] = useState(initialDraft.showPassword);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getDraft = (
    overrides: Partial<AuthCredentialsDraft> = {},
  ): AuthCredentialsDraft => ({
    name,
    email,
    mobileNumber,
    password,
    confirmPassword,
    showPassword,
    ...overrides,
  });

  const submit = async () => {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Your name is required.");
      return;
    }
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        if (mobileNumber.trim() && mobileNumber.trim().length !== 11) {
          setError("Mobile number must be exactly 11 digits.");
          setLoading(false);
          return;
        }
        const { pendingEmail } = await signup(
          normalizedEmail,
          name.trim(),
          password,
          mobileNumber.trim(),
        );
        setConfirmPassword("");
        await savePendingSignupOtp({
          email: pendingEmail,
          requestedAt: Date.now(),
        });
        onSignupPending(pendingEmail, getDraft({ confirmPassword: "" }));
      } else {
        await login(normalizedEmail, password);
      }
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    const nextMode = mode === "login" ? "signup" : "login";
    setError("");
    setConfirmPassword("");
    onModeChange(nextMode, getDraft({ confirmPassword: "" }));
  };

  const showForgotPassword = () => {
    setError("");
    onForgotPassword(getDraft());
  };

  return (
    <View className="rounded-3xl bg-white p-[26px] shadow-2xl shadow-black/20">
      <Text className="mb-2 text-center font-inter-bold text-[21px] text-gray-900">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </Text>

      {mode === "signup" && (
        <View className="mb-[18px]">
          <TextInput
            className={inputClassName}
            placeholder="Enter your name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>
      )}

      <View className="mb-[18px]">
        <TextInput
          className={inputClassName}
          placeholder="Enter your email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />
      </View>

      {mode === "signup" && (
        <View className="mb-[18px]">
          <TextInput
            className={inputClassName}
            placeholder="Enter mobile number (optional)"
            placeholderTextColor="#9CA3AF"
            value={mobileNumber}
            onChangeText={(value) =>
              setMobileNumber(value.replace(/\D/g, "").slice(0, 11))
            }
            keyboardType="phone-pad"
            returnKeyType="next"
          />
        </View>
      )}

      <View className="mb-[18px]">
        <View className="flex-row items-center gap-2">
          <TextInput
            className={`${inputClassName} flex-1`}
            placeholder="Enter password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            returnKeyType={mode === "signup" ? "next" : "done"}
            onSubmitEditing={mode === "login" ? () => void submit() : undefined}
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

      {mode === "signup" && (
        <View className="mb-[18px]">
          <View className="flex-row items-center gap-2">
            <TextInput
              className={`${inputClassName} flex-1`}
              placeholder="Confirm password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
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
      )}

      {mode === "login" && (
        <TouchableOpacity
          className="-mt-1.5 mb-2.5 items-end"
          onPress={showForgotPassword}
        >
          <Text className="font-inter-semibold text-[13px] text-teal-700">
            Forgot password?
          </Text>
        </TouchableOpacity>
      )}

      <ErrorBox error={error} />

      <TouchableOpacity
        className={`mt-1.5 h-[54px] items-center justify-center rounded-[14px] bg-teal-700 ${loading ? "opacity-50 shadow-none" : "opacity-100 shadow-lg shadow-teal-700/35"}`}
        onPress={() => void submit()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            className="font-inter-bold text-base tracking-[0.2px] text-white"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {mode === "signup" ? "Sign Up" : "Log\u00A0In"}
          </Text>
        )}
      </TouchableOpacity>

      <View className="mb-3.5 mt-5 flex-row items-center gap-2.5">
        <View className="h-px flex-1 bg-gray-200" />
        <Text className="font-inter-semibold text-[11px] tracking-[0.8px] text-gray-400">
          OR
        </Text>
        <View className="h-px flex-1 bg-gray-200" />
      </View>

      <GoogleSignInButton disabled={loading} />

      <TouchableOpacity className="mt-[18px] items-center" onPress={toggleMode}>
        <Text
          className="text-center font-inter text-sm text-gray-500"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {mode === "signup"
            ? "Already have an account? "
            : "Don't have an account? "}
          <Text className="font-inter-bold text-teal-700">
            {mode === "signup" ? "Log\u00A0In" : "Sign\u00A0Up"}
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
};
