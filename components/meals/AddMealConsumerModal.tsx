import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { useColors } from "@/hooks/useColors";

interface AddMealConsumerModalProps {
  visible: boolean;
  colors: ReturnType<typeof useColors>;
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
  colors,
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
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom:
                24 +
                (Platform.OS === "android" ? keyboardHeight : 0) +
                (Platform.OS === "android" ? bottomInset : 0),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Add Consumer
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={10}
              accessibilityLabel="Close add consumer form"
            >
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            A login account will be created and credentials sent by email.
          </Text>
          <TextInput
            style={[
              styles.input,
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
              styles.input,
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
              styles.input,
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
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={onSubmit}
          >
            <Text style={styles.submitText}>Add &amp; Send Credentials</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 12,
    gap: 16,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,118,110,0.06)",
  },
  title: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  spacedInput: { marginTop: 10 },
  error: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
    marginTop: 8,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
});
