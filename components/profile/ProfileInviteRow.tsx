import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ProfileInviteRowProps {
  expanded: boolean;
  email: string;
  sending: boolean;
  error: string;
  sent: boolean;
  onOpen: () => void;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
}

export const ProfileInviteRow = ({
  expanded,
  email,
  sending,
  error,
  sent,
  onOpen,
  onClose,
  onEmailChange,
  onSubmit,
}: ProfileInviteRowProps) => {
  if (!expanded) {
    return (
      <View className="flex-row items-center gap-3 border-b-[0.5px] border-slate-200 px-3.5 py-[13px]">
        <View className="h-[34px] w-[34px] items-center justify-center rounded-lg bg-blue-50">
          <Feather name="send" size={16} color="#3B82F6" />
        </View>
        <View className="flex-1">
          <Text className="font-inter-medium text-[11px] text-slate-500">
            Invite Member
          </Text>
          <Text className="mt-px font-inter-medium text-sm text-slate-900">
            Send join key via email
          </Text>
        </View>
        <TouchableOpacity
          className="flex-row items-center gap-[5px] rounded-lg bg-blue-50 px-2.5 py-[7px]"
          onPress={onOpen}
          activeOpacity={0.7}
        >
          <Feather name="send" size={15} color="#3B82F6" />
          <Text className="font-inter-semibold text-xs text-blue-500">
            Invite
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="border-b-[0.5px] border-slate-200">
      <View className="flex-row items-center gap-3 px-3.5 py-[13px]">
        <View className="h-[34px] w-[34px] items-center justify-center rounded-lg bg-blue-50">
          <Feather name="send" size={16} color="#3B82F6" />
        </View>
        <View className="flex-1">
          <Text className="font-inter-medium text-[11px] text-slate-500">
            Invite Email
          </Text>
          <TextInput
            autoFocus
            value={email}
            onChangeText={onEmailChange}
            onSubmitEditing={onSubmit}
            placeholder="someone@example.com"
            placeholderTextColor="#64748B"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="send"
            className="mt-0.5 border-b-[1.5px] border-blue-500 py-0.5 font-inter-medium text-[15px] text-slate-900"
            editable={!sending}
          />
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100"
            onPress={onClose}
            disabled={sending}
            activeOpacity={0.7}
          >
            <Feather name="x" size={16} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity
            className={`h-8 w-8 items-center justify-center rounded-lg ${sent ? "bg-emerald-600" : "bg-blue-500"}`}
            onPress={onSubmit}
            disabled={sending || sent}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size={14} color="#fff" />
            ) : (
              <Feather name={sent ? "check" : "send"} size={14} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
      {!!error && (
        <Text className="-mt-1 px-3.5 pb-2.5 font-inter text-xs text-red-600">
          {error}
        </Text>
      )}
      {sent && (
        <Text className="-mt-1 px-3.5 pb-2.5 font-inter text-xs text-emerald-600">
          Invite sent!
        </Text>
      )}
    </View>
  );
};
