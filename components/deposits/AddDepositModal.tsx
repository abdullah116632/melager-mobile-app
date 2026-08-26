import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import { useAuth, useDeposits, useNetwork } from "@/redux/hooks";
import type { DepositEntry } from "@/types/deposit";
import {
  formatDepositPickerDate,
  formatDepositTime,
  getCurrentDepositDate,
  getCurrentDepositTime,
} from "@/utils/deposit";
import { DepositDatePicker } from "./DepositDatePicker";
import { DepositTimePicker } from "./DepositTimePicker";

interface AddDepositModalProps {
  consumerId?: string | null;
  entry?: DepositEntry | null;
  onClose: () => void;
}

export const AddDepositModal = ({
  consumerId = null,
  entry = null,
  onClose,
}: AddDepositModalProps) => {
  const { activeMess } = useAuth();
  const { isOnline } = useNetwork();
  const { consumers, addEntry, updateEntry } = useDeposits();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getCurrentDepositDate());
  const [time, setTime] = useState(getCurrentDepositTime());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const amountInputRef = useRef<TextInput | null>(null);
  const isEditing = entry !== null;
  const activeConsumerId = entry?.consumerId.toString() ?? consumerId;
  const visible = activeConsumerId !== null;
  const consumerName =
    consumers.find((consumer) => consumer.id === activeConsumerId)?.name ?? "";
  const title = isEditing ? "Edit Deposit" : "Add Deposit";
  const submitLabel = isEditing ? "Save Changes" : "Add Deposit";
  const messId = activeMess?.id ?? null;

  useEffect(() => {
    if (!visible) return;
    if (entry) {
      const depositedAt = new Date(entry.depositedAt);
      const pad = (value: number) => String(value).padStart(2, "0");
      setAmount(String(entry.amount));
      setDate(
        `${depositedAt.getFullYear()}-${pad(depositedAt.getMonth() + 1)}-${pad(depositedAt.getDate())}`,
      );
      setTime(
        `${pad(depositedAt.getHours())}:${pad(depositedAt.getMinutes())}`,
      );
      setNote(entry.note ?? "");
    } else {
      setAmount("");
      setDate(getCurrentDepositDate());
      setTime(getCurrentDepositTime());
      setNote("");
    }
    setError("");
  }, [consumerId, entry, visible]);

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
    const timer = setTimeout(() => amountInputRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [visible]);

  const close = () => {
    Keyboard.dismiss();
    setShowDatePicker(false);
    setShowTimePicker(false);
    onClose();
  };

  const submit = async () => {
    if (!messId || !activeConsumerId) return;
    const trimmedAmount = amount.trim();
    const numericAmount = Number(trimmedAmount);
    if (
      !Number.isFinite(numericAmount) ||
      numericAmount === 0 ||
      !/^-?\d+(?:\.\d{1,3})?$/.test(trimmedAmount)
    ) {
      setError(
        "Enter a non-zero amount with up to 3 decimals, e.g. 500.125 or -500.125.",
      );
      return;
    }

    const resolvedDate =
      date.trim() || (isEditing ? "" : getCurrentDepositDate());
    const resolvedTime =
      time.trim() || (isEditing ? "" : getCurrentDepositTime());
    const depositedAt = new Date(`${resolvedDate}T${resolvedTime}:00`);
    if (Number.isNaN(depositedAt.getTime())) {
      setError("Invalid date or time. Use YYYY-MM-DD and HH:MM.");
      return;
    }

    if (isEditing && !isOnline) {
      setError("Internet connection required.");
      return;
    }
    setSaving(true);
    setError("");
    if (!isOnline) {
      setError("Internet connection required.");
      setSaving(false);
      return;
    }

    try {
      if (entry) {
        await updateEntry(entry.id, {
          messId,
          amount: numericAmount,
          depositedAt: depositedAt.toISOString(),
          note: note.trim() || undefined,
        });
      } else {
        await addEntry({
          messId,
          consumerId: parseInt(activeConsumerId, 10),
          amount: numericAmount,
          depositedAt: depositedAt.toISOString(),
          note: note.trim() || undefined,
        });
      }
      close();
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : isEditing
            ? "Failed to update."
            : "Failed to save.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
              className="rounded-t-3xl bg-white p-5 pb-9 shadow-2xl shadow-black/10"
              style={{
                marginBottom: Platform.OS === "android" ? keyboardHeight : 0,
              }}
            >
              <View className="mb-4 h-1 w-11 self-center rounded-sm bg-slate-200" />
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="font-inter-bold text-lg text-slate-900">
                  {title}
                </Text>
                <TouchableOpacity
                  className="h-[34px] w-[34px] items-center justify-center rounded-full bg-slate-100"
                  onPress={close}
                  accessibilityLabel="Close add deposit form"
                >
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text className="mb-4 font-inter text-[13px] text-slate-500">
                {consumerName}
              </Text>

              <ScrollView
                className="max-h-80"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text className="mb-1 mt-2.5 font-inter-medium text-xs text-slate-500">
                  Amount (৳) *
                </Text>
                <TextInput
                  ref={amountInputRef}
                  className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-[15px] text-slate-900"
                  placeholder="e.g. 500.125 or -500.125"
                  placeholderTextColor="#64748B"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="default"
                />
                <Text className="mt-1 font-inter text-[11px] text-slate-500">
                  Start with - for a negative entry. Up to 3 decimal places.
                </Text>

                <View className="flex-row">
                  <View className="mr-2 flex-1">
                    <Text className="mb-1 mt-2.5 font-inter-medium text-xs text-slate-500">
                      Date
                    </Text>
                    <TouchableOpacity
                      className="h-11 flex-row items-center gap-1.5 rounded-[10px] border border-slate-200 bg-slate-50 px-2.5"
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowDatePicker(true);
                      }}
                    >
                      <Feather
                        name="calendar"
                        size={15}
                        color={DEPOSIT_PRIMARY}
                      />
                      <Text
                        className="flex-1 font-inter-medium text-[13px] text-slate-900"
                        numberOfLines={1}
                      >
                        {formatDepositPickerDate(date)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 mt-2.5 font-inter-medium text-xs text-slate-500">
                      Time
                    </Text>
                    <TouchableOpacity
                      className="h-11 flex-row items-center gap-1.5 rounded-[10px] border border-slate-200 bg-slate-50 px-2.5"
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowTimePicker(true);
                      }}
                    >
                      <Feather name="clock" size={15} color={DEPOSIT_PRIMARY} />
                      <Text
                        className="flex-1 font-inter-medium text-[13px] text-slate-900"
                        numberOfLines={1}
                      >
                        {formatDepositTime(time)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="mb-1 mt-2.5 font-inter-medium text-xs text-slate-500">
                  Note (optional)
                </Text>
                <TextInput
                  className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-[15px] text-slate-900"
                  placeholder="e.g. Cash payment"
                  placeholderTextColor="#64748B"
                  value={note}
                  onChangeText={setNote}
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
                  onPress={() => void submit()}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="font-inter-semibold text-white">
                      {submitLabel}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <DepositDatePicker
        visible={showDatePicker}
        initialDate={date}
        onClose={() => setShowDatePicker(false)}
        onSelect={(value) => {
          setDate(value);
          setShowDatePicker(false);
        }}
      />
      <DepositTimePicker
        visible={showTimePicker}
        initialTime={time}
        onClose={() => setShowTimePicker(false)}
        onSelect={(value) => {
          setTime(value);
          setShowTimePicker(false);
        }}
      />
    </>
  );
};
