import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useConsumerUserLookup } from "@/hooks/useConsumerUserLookup";
import { useDeposits } from "@/redux/hooks";
import { isValidEmail } from "@/utils/email";

interface AddDepositConsumerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddDepositConsumerModal = ({
  visible,
  onClose,
}: AddDepositConsumerModalProps) => {
  const { addConsumer } = useDeposits();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const emailInputRef = useRef<TextInput | null>(null);
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
    const timer = setTimeout(() => emailInputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [visible]);

  const resetAndClose = () => {
    Keyboard.dismiss();
    setName("");
    setEmail("");
    setPhone("");
    setError("");
    onClose();
  };

  const close = () => {
    if (submitting) return;
    resetAndClose();
  };

  const submit = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim();
    const trimmedName = (lookup.name ?? name).trim();
    const trimmedPhone = phone.trim() || undefined;
    setError("");
    if (!isValidEmail(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (lookupPending) {
      setError("Please wait while we check this email.");
      return;
    }
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (trimmedPhone && trimmedPhone.length !== 11) {
      setError("Phone must be exactly 11 digits.");
      return;
    }
    setSubmitting(true);
    try {
      const { invitationSent } = await addConsumer(
        trimmedName,
        trimmedEmail,
        trimmedPhone,
      );
      resetAndClose();
      Alert.alert(
        "Member added",
        invitationSent
          ? "This person already has a Mealager account and has been added to this mess. We emailed the mess key for reference."
          : "The member was added successfully. Login credentials have been sent by email.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
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
                Add Member
              </Text>
              <TouchableOpacity
                className="h-[34px] w-[34px] items-center justify-center rounded-full bg-slate-100"
                onPress={close}
                disabled={submitting}
                accessibilityLabel="Close add member form"
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text className="mb-4 font-inter text-[13px] text-slate-500">
              Enter an email first. We will use the existing account or create a
              new one.
            </Text>

            <ScrollView
              className="max-h-80"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <TextInput
                ref={emailInputRef}
                className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-[15px] text-slate-900"
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
                className={`mt-2.5 rounded-[10px] border border-slate-200 px-3 py-2.5 font-inter text-[15px] text-slate-900 ${canEditName ? "bg-slate-50" : "bg-slate-200"}`}
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
                className="mt-2.5 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-[15px] text-slate-900"
                placeholder="Phone number (optional, 11 digits)"
                placeholderTextColor="#64748B"
                value={phone}
                onChangeText={(value) =>
                  setPhone(value.replace(/\D/g, "").slice(0, 11))
                }
                keyboardType="phone-pad"
                editable={!submitting}
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
              />
              {error ? (
                <Text className="mt-2 font-inter text-[13px] text-red-600">
                  {error}
                </Text>
              ) : null}
            </ScrollView>

            <View className="mt-5 flex-row gap-2.5">
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-[13px] ${submitting || lookupPending ? "opacity-70" : "opacity-100"}`}
                onPress={() => void submit()}
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
