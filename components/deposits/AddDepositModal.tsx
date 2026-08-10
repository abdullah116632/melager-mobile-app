import Feather from "@expo/vector-icons/Feather";
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
import { formatDepositPickerDate, formatDepositTime } from "@/utils/deposit";
import { DepositDatePicker } from "./DepositDatePicker";
import { DepositTimePicker } from "./DepositTimePicker";

interface AddDepositModalProps {
  visible: boolean;
  consumerName: string;
  amount: string;
  date: string;
  time: string;
  note: string;
  error: string;
  saving: boolean;
  onAmountChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export const AddDepositModal = ({
  visible,
  consumerName,
  amount,
  date,
  time,
  note,
  error,
  saving,
  onAmountChange,
  onDateChange,
  onTimeChange,
  onNoteChange,
  onClose,
  onSubmit,
}: AddDepositModalProps) => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const amountInputRef = useRef<TextInput | null>(null);

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
    onClose();
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
                  Add Deposit
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
                  placeholder="e.g. 500"
                  placeholderTextColor="#64748B"
                  value={amount}
                  onChangeText={onAmountChange}
                  keyboardType="number-pad"
                />

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
                  onChangeText={onNoteChange}
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
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="font-inter-semibold text-white">
                      Add Deposit
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
          onDateChange(value);
          setShowDatePicker(false);
        }}
      />
      <DepositTimePicker
        visible={showTimePicker}
        initialTime={time}
        onClose={() => setShowTimePicker(false)}
        onSelect={(value) => {
          onTimeChange(value);
          setShowTimePicker(false);
        }}
      />
    </>
  );
};
