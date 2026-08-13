import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ErrorBox } from "./AuthFeedback";
import { GoogleSignInButton } from "./GoogleSignInButton";

type LoginSignupCardProps = {
  mode: "login" | "signup";
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onMobileNumberChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
  onToggleMode: () => void;
};

const inputClassName =
  "h-[50px] rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF] px-[15px] font-inter text-[15px] text-gray-900";

export const LoginSignupCard = ({
  mode,
  name,
  email,
  mobileNumber,
  password,
  showPassword,
  loading,
  error,
  onNameChange,
  onEmailChange,
  onMobileNumberChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onForgotPassword,
  onToggleMode,
}: LoginSignupCardProps) => (
  <View className="rounded-3xl bg-white p-[26px] shadow-2xl shadow-black/20">
    <Text className="mb-2 text-center font-inter-bold text-[21px] text-gray-900">
      {mode === "signup" ? "Create your account" : "Welcome back"}
    </Text>

    {mode === "signup" && (
      <View className="mb-[18px]">
        <Text className="mb-[7px] font-inter-semibold text-[13px] text-gray-700">
          Your Name
        </Text>
        <TextInput
          className={inputClassName}
          placeholder="e.g. Abdullah"
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={onNameChange}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>
    )}

    <View className="mb-[18px]">
      <Text className="mb-[7px] font-inter-semibold text-[13px] text-gray-700">
        Email
      </Text>
      <TextInput
        className={inputClassName}
        placeholder="you@example.com"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={onEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="next"
      />
    </View>

    {mode === "signup" && (
      <View className="mb-[18px]">
        <Text className="mb-[7px] font-inter-semibold text-[13px] text-gray-700">
          Mobile Number{" "}
          <Text className="font-inter text-gray-400">(Optional)</Text>
        </Text>
        <TextInput
          className={inputClassName}
          placeholder="11-digit number"
          placeholderTextColor="#9CA3AF"
          value={mobileNumber}
          onChangeText={onMobileNumberChange}
          keyboardType="phone-pad"
          returnKeyType="next"
        />
      </View>
    )}

    <View className="mb-[18px]">
      <Text className="mb-[7px] font-inter-semibold text-[13px] text-gray-700">
        Password
      </Text>
      <View className="flex-row items-center gap-2">
        <TextInput
          className={`${inputClassName} flex-1`}
          placeholder="Min. 6 characters"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry={!showPassword}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
        <TouchableOpacity
          className="h-[50px] w-[50px] items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF]"
          onPress={onTogglePassword}
        >
          <Feather
            name={showPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
    </View>

    {mode === "login" && (
      <TouchableOpacity
        className="-mt-1.5 mb-2.5 items-end"
        onPress={onForgotPassword}
      >
        <Text className="font-inter-semibold text-[13px] text-teal-700">
          Forgot password?
        </Text>
      </TouchableOpacity>
    )}

    <ErrorBox error={error} />

    <TouchableOpacity
      className={`mt-1.5 h-[54px] items-center justify-center rounded-[14px] bg-teal-700 ${loading ? "opacity-50 shadow-none" : "opacity-100 shadow-lg shadow-teal-700/35"}`}
      onPress={onSubmit}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="font-inter-bold text-base tracking-[0.2px] text-white">
          {mode === "signup" ? "Sign Up" : "Log In"}
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

    <TouchableOpacity className="mt-[18px] items-center" onPress={onToggleMode}>
      <Text className="font-inter text-sm text-gray-500">
        {mode === "signup"
          ? "Already have an account? "
          : "Don't have an account? "}
        <Text className="font-inter-bold text-teal-700">
          {mode === "signup" ? "Log In" : "Sign Up"}
        </Text>
      </Text>
    </TouchableOpacity>
  </View>
);
