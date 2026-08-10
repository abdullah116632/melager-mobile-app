import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { MessSetupMode } from "@/types/messSetup";

interface MessSetupFormProps {
  mode: MessSetupMode;
  value: string;
  error: string;
  loading: boolean;
  onChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const MessSetupForm = ({
  mode,
  value,
  error,
  loading,
  onChange,
  onBack,
  onSubmit,
}: MessSetupFormProps) => {
  const isCreate = mode === "create";

  return (
    <View className="items-center rounded-3xl bg-white p-6 shadow-xl shadow-black/15">
      <TouchableOpacity
        className="mb-[18px] flex-row items-center gap-1.5 self-start"
        onPress={onBack}
      >
        <Feather name="arrow-left" size={18} color="#0F766E" />
        <Text className="font-inter-semibold text-sm text-teal-700">Back</Text>
      </TouchableOpacity>
      <Text className="mb-1.5 text-center font-inter-bold text-[21px] text-gray-900">
        {isCreate ? "Create a Mess" : "Join a Mess"}
      </Text>
      <Text className="mb-[22px] text-center font-inter text-[13px] leading-5 text-gray-500">
        {isCreate
          ? "Give your mess a name. You'll receive a unique key to share with members."
          : "Enter the 8-character mess key. Your request will be sent to the admin for approval."}
      </Text>

      <View className="mb-[18px] w-full">
        <Text className="mb-[7px] font-inter-semibold text-[13px] text-gray-700">
          {isCreate ? "Mess Name" : "Mess Key"}
        </Text>
        <TextInput
          className={`h-[50px] w-full rounded-xl border-[1.5px] border-gray-200 bg-[#FAFCFF] px-[15px] text-gray-900 ${isCreate ? "font-inter text-[15px]" : "text-center font-inter-bold text-xl tracking-[4px]"}`}
          placeholder={isCreate ? "e.g. Sunrise Mess" : "e.g. A3F92B1C"}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={(nextValue) =>
            onChange(isCreate ? nextValue : nextValue.toUpperCase())
          }
          autoCapitalize={isCreate ? "words" : "characters"}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          autoFocus
          maxLength={isCreate ? undefined : 8}
        />
      </View>

      {error ? (
        <View className="mb-3.5 w-full flex-row items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 px-[13px] py-[11px]">
          <Feather name="alert-circle" size={14} color="#DC2626" />
          <Text className="flex-1 font-inter text-[13px] leading-[18px] text-red-600">
            {error}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        className={`h-[54px] w-full flex-row items-center justify-center gap-2 rounded-[14px] ${isCreate ? "bg-teal-700 shadow-lg shadow-teal-700/35" : "bg-blue-500"} ${loading ? "opacity-70" : "opacity-100"}`}
        onPress={onSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather
              name={isCreate ? "plus-circle" : "send"}
              size={18}
              color="#fff"
            />
            <Text className="font-inter-bold text-base text-white">
              {isCreate ? "Create Mess" : "Send Join Request"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
