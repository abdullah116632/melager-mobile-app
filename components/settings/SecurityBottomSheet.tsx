import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

interface SecurityBottomSheetProps {
  visible: boolean;
  canClose: boolean;
  androidKeyboardOffset: number;
  children: ReactNode;
  onClose: () => void;
}

export const SecurityBottomSheet = ({
  visible,
  canClose,
  androidKeyboardOffset,
  children,
  onClose,
}: SecurityBottomSheetProps) => (
  <Modal
    transparent
    visible={visible}
    animationType="slide"
    onRequestClose={canClose ? onClose : undefined}
  >
    <View className="flex-1 bg-black/50">
      <TouchableOpacity
        className="absolute inset-0"
        onPress={canClose ? onClose : undefined}
        activeOpacity={1}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        className="flex-1 justify-end"
        style={{ paddingBottom: androidKeyboardOffset }}
      >
        <View className="max-h-[92%] w-full rounded-t-[28px] border-t border-slate-100 bg-white px-6 pt-7 shadow-2xl shadow-black/20">
          <View className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-200" />
          {canClose && (
            <TouchableOpacity
              className="absolute right-4 top-4 z-10 p-1"
              onPress={onClose}
            >
              <Feather name="x" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
          <ScrollView
            contentContainerClassName="pb-safe-offset-6"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);
