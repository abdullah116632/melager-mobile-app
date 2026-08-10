import Feather from "@expo/vector-icons/Feather";
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
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import type { AppColors } from "@/types/theme";
import { depositStyles as styles } from "./depositStyles";

interface AddDepositConsumerModalProps {
  visible: boolean;
  colors: AppColors;
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
  colors,
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
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalSpacer}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          />
          <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
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
                Add Consumer
              </Text>
              <TouchableOpacity
                style={[
                  styles.sheetCloseButton,
                  { backgroundColor: colors.secondary },
                ]}
                onPress={close}
                accessibilityLabel="Close add consumer form"
              >
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text
              style={[styles.sheetSubtitle, { color: colors.mutedForeground }]}
            >
              A login account will be created and credentials sent by email.
            </Text>

            <ScrollView
              style={styles.sheetFormList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <TextInput
                style={[
                  styles.sheetInput,
                  {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="Full name *"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={onNameChange}
                autoFocus
                returnKeyType="next"
              />
              <TextInput
                style={[
                  styles.sheetInput,
                  styles.spacedInput,
                  {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="Email *"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={onEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
              <TextInput
                style={[
                  styles.sheetInput,
                  styles.spacedInput,
                  {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="Phone number (optional, 11 digits)"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={(value) =>
                  onPhoneChange(value.replace(/\D/g, "").slice(0, 11))
                }
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
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
              >
                <Text style={styles.sheetButtonText}>
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
