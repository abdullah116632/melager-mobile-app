import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/redux/hooks";
import { sendMessInvite } from "@/services/profileService";
import { isValidInviteEmail } from "@/utils/profile";

export const ProfileInviteRow = () => {
  const { mess, role, token } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (role !== "admin" || !mess) return null;

  const onOpen = () => {
    setExpanded(true);
    setError("");
    setSent(false);
  };

  const onClose = () => {
    setExpanded(false);
    setEmail("");
    setError("");
  };

  const onEmailChange = (value: string) => {
    setEmail(value);
    setError("");
  };

  const onSubmit = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !isValidInviteEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!token) return;

    setSending(true);
    setError("");
    try {
      await sendMessInvite(mess.id, normalizedEmail, token);
      setSent(true);
      setEmail("");
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      setTimeout(() => {
        setExpanded(false);
        setSent(false);
      }, 2000);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to send invite.",
      );
    } finally {
      setSending(false);
    }
  };

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
            onSubmitEditing={() => void onSubmit()}
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
            onPress={() => void onSubmit()}
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
