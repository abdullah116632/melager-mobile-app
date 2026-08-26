import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMeals } from "@/redux/hooks";

interface AddMealConsumerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdded?: () => void | Promise<void>;
}

export const AddMealConsumerModal = ({
  visible,
  onClose,
  onAdded,
}: AddMealConsumerModalProps) => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  const { addConsumer } = useMeals();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

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

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setError("");
  };

  const closeModal = () => {
    resetForm();
    onClose();
  };

  const submitConsumer = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim() || undefined;
    setError("");
    if (!normalizedName) {
      setError("Name is required.");
      return;
    }
    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }
    if (normalizedPhone && normalizedPhone.length !== 11) {
      setError("Phone must be exactly 11 digits.");
      return;
    }
    try {
      const { invitationSent } = await addConsumer(
        normalizedName,
        normalizedEmail,
        normalizedPhone,
      );
      resetForm();
      onClose();
      void onAdded?.();
      if (invitationSent) {
        Alert.alert(
          "Member added",
          "This person already has a Melager account and has been added to this mess. We emailed the mess key for reference.",
        );
      }
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to add consumer.",
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/45"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={closeModal}
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
              Add Member
            </Text>
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-teal-700/[0.06]"
              onPress={closeModal}
              activeOpacity={0.7}
              hitSlop={10}
              accessibilityLabel="Close add member form"
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
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
          />
          <TextInput
            className="mt-2.5 rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 font-inter text-base text-slate-900"
            placeholder="Email *"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
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
              setPhone(value.replace(/\D/g, "").slice(0, 11))
            }
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={() => void submitConsumer()}
          />
          {error ? (
            <Text className="mt-2 font-inter text-[13px] text-red-600">
              {error}
            </Text>
          ) : null}
          <TouchableOpacity
            className="items-center justify-center rounded-[10px] bg-teal-700 py-3.5"
            onPress={() => void submitConsumer()}
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
