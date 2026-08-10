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
import type { AppColors } from "@/types/theme";
import { formatDepositPickerDate, formatDepositTime } from "@/utils/deposit";
import { DepositDatePicker } from "./DepositDatePicker";
import { DepositTimePicker } from "./DepositTimePicker";
import { depositStyles as styles } from "./depositStyles";

interface AddDepositModalProps {
  visible: boolean;
  colors: AppColors;
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
  colors,
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
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalSpacer}
              activeOpacity={1}
              onPress={() => Keyboard.dismiss()}
            />
            <View
              style={[
                styles.bottomSheet,
                {
                  backgroundColor: colors.card,
                  marginBottom: Platform.OS === "android" ? keyboardHeight : 0,
                },
              ]}
            >
              <View
                style={[styles.sheetHandle, { backgroundColor: colors.border }]}
              />
              <View style={styles.sheetTitleRow}>
                <Text
                  style={[
                    styles.sheetTitle,
                    styles.sheetTitleNoMargin,
                    { color: colors.foreground },
                  ]}
                >
                  Add Deposit
                </Text>
                <TouchableOpacity
                  style={[
                    styles.sheetCloseButton,
                    { backgroundColor: colors.secondary },
                  ]}
                  onPress={close}
                  accessibilityLabel="Close add deposit form"
                >
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <Text
                style={[
                  styles.sheetSubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                {consumerName}
              </Text>

              <ScrollView
                style={styles.sheetFormList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground }]}
                >
                  Amount (৳) *
                </Text>
                <TextInput
                  ref={amountInputRef}
                  style={[
                    styles.sheetInput,
                    {
                      borderColor: colors.border,
                      color: colors.foreground,
                      backgroundColor: colors.background,
                    },
                  ]}
                  placeholder="e.g. 500"
                  placeholderTextColor={colors.mutedForeground}
                  value={amount}
                  onChangeText={onAmountChange}
                  keyboardType="number-pad"
                />

                <View style={styles.dateTimeRow}>
                  <View style={styles.dateField}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Date
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.pickerInput,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
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
                        style={[
                          styles.pickerInputText,
                          { color: colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {formatDepositPickerDate(date)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timeField}>
                    <Text
                      style={[
                        styles.fieldLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Time
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.pickerInput,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.background,
                        },
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowTimePicker(true);
                      }}
                    >
                      <Feather name="clock" size={15} color={DEPOSIT_PRIMARY} />
                      <Text
                        style={[
                          styles.pickerInputText,
                          { color: colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {formatDepositTime(time)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text
                  style={[styles.fieldLabel, { color: colors.mutedForeground }]}
                >
                  Note (optional)
                </Text>
                <TextInput
                  style={[
                    styles.sheetInput,
                    {
                      borderColor: colors.border,
                      color: colors.foreground,
                      backgroundColor: colors.background,
                    },
                  ]}
                  placeholder="e.g. Cash payment"
                  placeholderTextColor={colors.mutedForeground}
                  value={note}
                  onChangeText={onNoteChange}
                />
                {error ? <Text style={styles.sheetError}>{error}</Text> : null}
              </ScrollView>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[
                    styles.sheetButton,
                    { backgroundColor: DEPOSIT_PRIMARY },
                  ]}
                  onPress={onSubmit}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sheetButtonText}>Add Deposit</Text>
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
        colors={colors}
        onClose={() => setShowDatePicker(false)}
        onSelect={(value) => {
          onDateChange(value);
          setShowDatePicker(false);
        }}
      />
      <DepositTimePicker
        visible={showTimePicker}
        initialTime={time}
        colors={colors}
        onClose={() => setShowTimePicker(false)}
        onSelect={(value) => {
          onTimeChange(value);
          setShowTimePicker(false);
        }}
      />
    </>
  );
};
