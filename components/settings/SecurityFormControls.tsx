import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type IconName = ComponentProps<typeof Feather>["name"];

export const SecurityErrorBox = ({ message }: { message: string }) =>
  message ? (
    <View className="mb-3 flex-row items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2.5">
      <Feather name="alert-circle" size={14} color="#DC2626" />
      <Text className="flex-1 font-inter text-[13px] text-red-600">
        {message}
      </Text>
    </View>
  ) : null;

interface OtpFieldProps {
  value: string;
  onChange: (value: string) => void;
  onClearError: () => void;
}

export const OtpField = ({ value, onChange, onClearError }: OtpFieldProps) => (
  <TextInput
    className="mb-3 h-16 rounded-xl border-2 border-teal-700 bg-gray-50 text-center font-inter-bold text-[28px] tracking-[12px] text-gray-900"
    value={value}
    onChangeText={(nextValue) => {
      onChange(nextValue.replace(/\D/g, "").slice(0, 6));
      onClearError();
    }}
    keyboardType="number-pad"
    maxLength={6}
    placeholder="• • • • • •"
    placeholderTextColor="#CBD5E1"
    autoFocus
  />
);

interface ResendRowProps {
  secondsRemaining: number;
  onResend: () => void;
}

export const ResendRow = ({ secondsRemaining, onResend }: ResendRowProps) => (
  <TouchableOpacity
    className="mt-3.5 items-center"
    onPress={onResend}
    disabled={secondsRemaining > 0}
  >
    <Text
      className={`font-inter-medium text-sm ${secondsRemaining > 0 ? "text-gray-400" : "text-teal-700"}`}
    >
      {secondsRemaining > 0
        ? `Resend code in ${secondsRemaining}s`
        : "Didn't receive it? Resend code"}
    </Text>
  </TouchableOpacity>
);

interface SecuritySubmitButtonProps {
  loading: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}

export const SecuritySubmitButton = ({
  loading,
  disabled,
  label,
  onPress,
}: SecuritySubmitButtonProps) => (
  <TouchableOpacity
    className={`mt-2 h-[52px] items-center justify-center rounded-xl bg-teal-700 ${loading || disabled ? "opacity-50" : "opacity-100"}`}
    onPress={onPress}
    disabled={loading || disabled}
  >
    {loading ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text className="font-inter-bold text-base text-white">{label}</Text>
    )}
  </TouchableOpacity>
);

interface SecuritySuccessCardProps {
  icon: IconName;
  iconClassName: string;
  iconColor: string;
  title: string;
  body: string;
  onClose: () => void;
}

export const SecuritySuccessCard = ({
  icon,
  iconClassName,
  iconColor,
  title,
  body,
  onClose,
}: SecuritySuccessCardProps) => (
  <View className="items-center py-6">
    <View
      className={`mb-5 h-[88px] w-[88px] items-center justify-center rounded-full ${iconClassName}`}
    >
      <Feather name={icon} size={40} color={iconColor} />
    </View>
    <Text className="mb-2.5 font-inter-bold text-[22px] text-gray-900">
      {title}
    </Text>
    <Text className="text-center font-inter text-sm leading-[22px] text-gray-500">
      {body}
    </Text>
    <TouchableOpacity
      className="mt-6 h-[52px] w-full items-center justify-center rounded-xl bg-teal-700"
      onPress={onClose}
    >
      <Text className="font-inter-bold text-base text-white">Done</Text>
    </TouchableOpacity>
  </View>
);
