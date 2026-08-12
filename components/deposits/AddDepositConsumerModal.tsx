import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface AddDepositConsumerModalProps {
  visible: boolean;
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

export const AddDepositConsumerModal = ({
  visible,
  name,
  email,
  phone,
  error,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onClose,
  onSubmit,
}: AddDepositConsumerModalProps) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const nameInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardHeight(0),
    );
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => nameInputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [visible]);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          />
          <View
            className="max-h-[90%] rounded-t-3xl bg-white p-5 pb-9 shadow-2xl shadow-black/10"
            style={{
              marginBottom: Platform.OS === "android" ? keyboardHeight : 0,
            }}
          >
            <View className="mb-4 h-1 w-11 self-center rounded-sm bg-slate-200" />
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="font-inter-bold text-lg text-slate-900">
                Add Consumer
              </Text>
              <TouchableOpacity
                className="h-[34px] w-[34px] items-center justify-center rounded-full bg-slate-100"
                onPress={close}
                accessibilityLabel="Close add consumer form"
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text className="mb-4 font-inter text-[13px] text-slate-500">
              A login account will be created and credentials sent by email.
            </Text>

            <ScrollView
              className="max-h-80"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <TextInput
                ref={nameInputRef}
                className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-[15px] text-slate-900"
                placeholder="Full name *"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={onNameChange}
                returnKeyType="next"
              />
              <TextInput
                className="mt-2.5 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-[15px] text-slate-900"
                placeholder="Email *"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={onEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
              <TextInput
                className="mt-2.5 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-[15px] text-slate-900"
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
            </ScrollView>

            <View className="mt-5 flex-row gap-2.5">
              <TouchableOpacity
                className="flex-1 items-center justify-center rounded-xl bg-teal-700 px-4 py-[13px]"
                onPress={onSubmit}
              >
                <Text className="font-inter-semibold text-white">
                  Add &amp; Send Credentials
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
