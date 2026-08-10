import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface AddMealConsumerModalProps {
  visible: boolean;
  bottomInset: number;
  name: string;
  email: string;
  phone: string;
  error: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const AddMealConsumerModal = ({
  visible,
  bottomInset,
  name,
  email,
  phone,
  error,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onClose,
  onSubmit,
}: AddMealConsumerModalProps) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => setKeyboardHeight(event.endCoordinates.height),
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/45"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          className="gap-4 rounded-t-3xl bg-white p-6 pt-3"
          style={{
            paddingBottom:
              24 +
              (Platform.OS === "android" ? keyboardHeight : 0) +
              (Platform.OS === "android" ? bottomInset : 0),
          }}
        >
          <View className="mb-2 h-1 w-11 self-center rounded-sm bg-slate-200" />
          <View className="flex-row items-center justify-between gap-3">
            <Text className="flex-1 font-inter-bold text-lg text-slate-900">
              Add Consumer
            </Text>
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-teal-700/[0.06]"
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={10}
              accessibilityLabel="Close add consumer form"
            >
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text className="my-1 font-inter text-[13px] text-slate-500">
            A login account will be created and credentials sent by email.
          </Text>
          <TextInput
            className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 font-inter text-base text-slate-900"
            placeholder="Full name *"
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={onNameChange}
            autoFocus
            returnKeyType="next"
          />
          <TextInput
            className="mt-2.5 rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 font-inter text-base text-slate-900"
            placeholder="Email *"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={onEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
          <TextInput
            className="mt-2.5 rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 font-inter text-base text-slate-900"
            placeholder="Phone number (optional, 11 digits)"
            placeholderTextColor="#64748B"
            value={phone}
            onChangeText={(value) =>
              onPhoneChange(value.replace(/\D/g, "").slice(0, 11))
            }
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
          {error ? (
            <Text className="mt-2 font-inter text-[13px] text-red-600">
              {error}
            </Text>
          ) : null}
          <TouchableOpacity
            className="items-center justify-center rounded-[10px] bg-teal-700 py-3.5"
            onPress={onSubmit}
          >
            <Text className="font-inter-semibold text-white">
              Add &amp; Send Credentials
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
