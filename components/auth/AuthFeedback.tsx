import Feather from "@expo/vector-icons/Feather";
import { Text, TouchableOpacity, View } from "react-native";

export const ErrorBox = ({ error }: { error: string }) => {
  if (!error) return null;

  return (
    <View className="mb-3.5 flex-row items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-[13px] py-[11px]">
      <Feather name="alert-circle" size={14} color="#DC2626" />
      <Text className="flex-1 font-inter text-[13px] leading-[18px] text-red-600">
        {error}
      </Text>
    </View>
  );
};

export const BackRow = ({
  onPress,
  label,
}: {
  onPress: () => void;
  label: string;
}) => (
  <TouchableOpacity
    className="mb-[22px] flex-row items-center gap-1.5"
    onPress={onPress}
  >
    <Feather name="arrow-left" size={16} color="#0F766E" />
    <Text className="font-inter-semibold text-sm text-teal-700">{label}</Text>
  </TouchableOpacity>
);

export const ResendRow = ({
  onResend,
  resendTimer,
}: {
  onResend: () => void;
  resendTimer: number;
}) => {
  const disabled = resendTimer > 0;

  return (
    <TouchableOpacity
      className="mt-[18px] items-center"
      onPress={onResend}
      disabled={disabled}
    >
      <Text
        className={`font-inter-medium text-sm ${disabled ? "text-gray-400" : "text-teal-700"}`}
      >
        {disabled
          ? `Resend code in ${resendTimer}s`
          : "Didn't receive it? Resend code"}
      </Text>
    </TouchableOpacity>
  );
};
