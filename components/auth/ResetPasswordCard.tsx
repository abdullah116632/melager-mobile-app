import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { BackRow, ErrorBox } from "./AuthFeedback";

type ResetPasswordCardProps = {
  newPassword: string;
  confirmPassword: string;
  showNewPassword: boolean;
  error: string;
  loading: boolean;
  onBack: () => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
};

const inputClassName =
  "h-[50px] rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF] px-[15px] font-inter text-[15px] text-gray-900";

export const ResetPasswordCard = ({
  newPassword,
  confirmPassword,
  showNewPassword,
  error,
  loading,
  onBack,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onTogglePassword,
  onSubmit,
}: ResetPasswordCardProps) => (
  <View className="rounded-3xl bg-white p-[26px] shadow-2xl shadow-black/20">
    <BackRow onPress={onBack} label="Back" />
    <View className="mb-[18px] h-[68px] w-[68px] items-center justify-center self-center rounded-full border-[1.5px] border-teal-100 bg-orange-50">
      <Feather name="key" size={28} color="#EA580C" />
    </View>
    <Text className="mb-2 text-center font-inter-bold text-[21px] text-gray-900">
      Set New Password
    </Text>
    <Text className="mb-6 text-center font-inter text-sm leading-[22px] text-gray-500">
      Choose a new password for your account.
    </Text>
    <View className="mb-[18px]">
      <View className="flex-row items-center gap-2">
        <TextInput
          className={`${inputClassName} flex-1`}
          placeholder="Enter new password"
          placeholderTextColor="#9CA3AF"
          value={newPassword}
          onChangeText={onNewPasswordChange}
          secureTextEntry={!showNewPassword}
          returnKeyType="next"
          autoFocus
        />
        <TouchableOpacity
          className="h-[50px] w-[50px] items-center justify-center rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF]"
          onPress={onTogglePassword}
        >
          <Feather
            name={showNewPassword ? "eye-off" : "eye"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
    </View>
    <View className="mb-[18px]">
      <TextInput
        className={inputClassName}
        placeholder="Confirm new password"
        placeholderTextColor="#9CA3AF"
        value={confirmPassword}
        onChangeText={onConfirmPasswordChange}
        secureTextEntry={!showNewPassword}
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
          Reset Password
        </Text>
      )}
    </TouchableOpacity>
  </View>
);
