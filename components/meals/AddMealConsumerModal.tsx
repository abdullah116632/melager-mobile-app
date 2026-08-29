import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { useConsumerUserLookup } from "@/hooks/useConsumerUserLookup";
import { useMeals } from "@/redux/hooks";
import { isValidEmail } from "@/utils/email";

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
  const [submitting, setSubmitting] = useState(false);
  const lookup = useConsumerUserLookup(email, visible);
  const lookupPending =
    isValidEmail(email) &&
    (lookup.status === "idle" || lookup.status === "loading");
  const canEditName =
    lookup.status === "not-found" || lookup.status === "error";

  useEffect(() => {
    if (lookup.status === "found" && lookup.name) setName(lookup.name);
  }, [lookup.name, lookup.status]);

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
    if (submitting) return;
    resetForm();
    onClose();
  };

  const submitConsumer = async () => {
    if (submitting) return;
    const normalizedEmail = email.trim();
    const normalizedName = (lookup.name ?? name).trim();
    const normalizedPhone = phone.trim() || undefined;
    setError("");
    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (lookupPending) {
      setError("Please wait while we check this email.");
      return;
    }
    if (!normalizedName) {
      setError("Name is required.");
      return;
    }
    if (normalizedPhone && normalizedPhone.length !== 11) {
      setError("Phone must be exactly 11 digits.");
      return;
    }
    setSubmitting(true);
    try {
      const { invitationSent } = await addConsumer(
        normalizedName,
        normalizedEmail,
        normalizedPhone,
      );
      resetForm();
      onClose();
      void onAdded?.();
      Alert.alert(
        "Member added",
        invitationSent
          ? "This person already has a Melager account and has been added to this mess. We emailed the mess key for reference."
          : "The member was added successfully. Login credentials have been sent by email.",
      );
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeModal}
    >
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
              disabled={submitting}
              activeOpacity={0.7}
              hitSlop={10}
              accessibilityLabel="Close add member form"
            >
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text className="my-1 font-inter text-[13px] text-slate-500">
            Enter an email first. We will use the existing account or create a
            new one.
          </Text>
          <TextInput
            className="rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-3 font-inter text-base text-slate-900"
            placeholder="Email *"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setName("");
              setError("");
            }}
            editable={!submitting}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
            returnKeyType="next"
          />
          {lookup.status === "loading" ? (
            <View className="mt-2 flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#0F766E" />
              <Text className="font-inter text-[12px] text-slate-500">
                Checking for an existing account...
              </Text>
            </View>
          ) : lookup.status === "found" ? (
            <Text className="mt-2 font-inter text-[12px] text-emerald-700">
              Existing account found. Name filled automatically.
            </Text>
          ) : lookup.status === "not-found" ? (
            <Text className="mt-2 font-inter text-[12px] text-slate-500">
              No account found. Enter a name to create one.
            </Text>
          ) : lookup.status === "error" ? (
            <Text className="mt-2 font-inter text-[12px] text-amber-700">
              Could not check this email. You can still enter the name.
            </Text>
          ) : null}
          <TextInput
            className={`mt-2.5 rounded-[10px] border border-slate-200 px-3.5 py-3 font-inter text-base text-slate-900 ${canEditName ? "bg-slate-50" : "bg-slate-200"}`}
            placeholder={
              lookup.status === "loading"
                ? "Checking account..."
                : lookup.status === "idle"
                  ? "Enter a valid email first"
                  : "Full name *"
            }
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
            editable={!submitting && canEditName}
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
            editable={!submitting}
            returnKeyType="done"
            onSubmitEditing={() => void submitConsumer()}
          />
          {error ? (
            <Text className="mt-2 font-inter text-[13px] text-red-600">
              {error}
            </Text>
          ) : null}
          <TouchableOpacity
            className={`flex-row items-center justify-center gap-2 rounded-[10px] bg-teal-700 py-3.5 ${submitting || lookupPending ? "opacity-70" : "opacity-100"}`}
            onPress={() => void submitConsumer()}
            disabled={submitting || lookupPending}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : null}
            <Text className="font-inter-semibold text-white">
              {submitting ? "Adding Member..." : "Add & Send Credentials"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
