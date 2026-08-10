import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { BackRow, ErrorBox } from "./AuthFeedback";

type ForgotPasswordCardProps = {
  email: string;
  error: string;
  loading: boolean;
  onBack: () => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
};

export const ForgotPasswordCard = ({
  email,
  error,
  loading,
  onBack,
  onEmailChange,
  onSubmit,
}: ForgotPasswordCardProps) => (
  <View className="rounded-3xl bg-white p-[26px] shadow-2xl shadow-black/20">
    <BackRow onPress={onBack} label="Back to Login" />
    <View className="mb-[18px] h-[68px] w-[68px] items-center justify-center self-center rounded-full border-[1.5px] border-teal-100 bg-teal-50">
      <Feather name="lock" size={28} color="#0F766E" />
    </View>
    <Text className="mb-2 text-center font-inter-bold text-[21px] text-gray-900">
      Forgot Password?
    </Text>
    <Text className="mb-6 text-center font-inter text-sm leading-[22px] text-gray-500">
      Enter your registered email and we&apos;ll send you a reset code.
    </Text>
    <View className="mb-[18px]">
      <Text className="mb-[7px] font-inter-semibold text-[13px] text-gray-700">
        Email
      </Text>
      <TextInput
        className="h-[50px] rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF] px-[15px] font-inter text-[15px] text-gray-900"
        placeholder="you@example.com"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={onEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
    </View>
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
          Send Reset Code
        </Text>
      )}
    </TouchableOpacity>
  </View>
);
