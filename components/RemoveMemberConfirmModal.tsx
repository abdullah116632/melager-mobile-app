import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// See AddDepositConsumerModal: React Native's own KeyboardAvoidingView leaves
// a modal behind the keyboard under Android edge-to-edge.
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export type PendingMemberRemoval = {
  id: string;
  name: string;
};

interface RemoveMemberConfirmModalProps {
  member: PendingMemberRemoval | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const CODE_LENGTH = 8;
// No 0/O, 1/I/L: the code is read off the screen and typed back, so letters
// that look alike would only produce mismatches.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const generateCode = () =>
  Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");

const MONO_FONT = Platform.select({ ios: "Menlo", default: "monospace" });

// Everything the server's member delete removes, in the order it matters to an
// admin.
const REMOVED_ITEMS: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: "coffee", text: "All meal entries, every month" },
  { icon: "credit-card", text: "All deposits, every month" },
  { icon: "slash", text: "Meal-off records" },
  { icon: "shopping-bag", text: "Bazar duty assignments" },
  { icon: "user-x", text: "Membership in this mess" },
];

export const RemoveMemberConfirmModal = ({
  member,
  loading,
  onCancel,
  onConfirm,
}: RemoveMemberConfirmModalProps) => {
  const [code, setCode] = useState(generateCode);
  const [typed, setTyped] = useState("");

  // A fresh code every time the dialog opens, so an earlier attempt's code
  // can never confirm a different member.
  useEffect(() => {
    if (member) {
      setCode(generateCode());
      setTyped("");
    }
  }, [member]);

  const matches = typed === code;
  const showMismatch = typed.length === CODE_LENGTH && !matches;
  const canDelete = matches && !loading;

  const cancel = () => {
    if (loading) return;
    Keyboard.dismiss();
    onCancel();
  };

  return (
    <Modal
      visible={member !== null}
      transparent
      animationType="fade"
      onRequestClose={cancel}
    >
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <View className="flex-1 items-center justify-center bg-black/55 px-4">
          <View className="max-h-[92%] w-full max-w-[380px] overflow-hidden rounded-[22px] bg-white shadow-2xl shadow-black/25">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View className="items-center bg-red-600 px-6 pb-5 pt-6">
                <View className="mb-3 h-14 w-14 items-center justify-center rounded-full border-2 border-white/40 bg-white/15">
                  <Feather name="alert-triangle" size={26} color="#FFFFFF" />
                </View>
                <Text className="text-center font-inter-bold text-xl text-white">
                  Remove Member
                </Text>
                <Text
                  className="mt-1 text-center font-inter-semibold text-[15px] text-red-50"
                  numberOfLines={2}
                >
                  {member?.name}
                </Text>
              </View>

              <View className="px-5 pb-5 pt-4">
                <Text className="font-inter text-[13px] leading-5 text-slate-600">
                  This permanently deletes the following for{" "}
                  <Text className="font-inter-semibold text-slate-900">
                    {member?.name}
                  </Text>
                  :
                </Text>

                {/* What gets deleted */}
                <View className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2">
                  {REMOVED_ITEMS.map((item, index) => (
                    <View
                      key={item.text}
                      className={`flex-row items-center gap-2.5 py-2 ${
                        index > 0 ? "border-t border-red-100" : ""
                      }`}
                    >
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-red-100">
                        <Feather name={item.icon} size={14} color="#DC2626" />
                      </View>
                      <Text className="flex-1 font-inter-semibold text-[13px] text-red-700">
                        {item.text}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Side effects */}
                <View className="mt-3 gap-1.5">
                  <View className="flex-row gap-2">
                    <Feather
                      name="info"
                      size={13}
                      color="#B45309"
                      style={{ marginTop: 2 }}
                    />
                    <Text className="flex-1 font-inter text-xs leading-[18px] text-slate-600">
                      The meal rate and balances of the remaining members{" "}
                      <Text className="font-inter-semibold text-red-600">
                        will change
                      </Text>
                      , including past months.
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <Feather
                      name="info"
                      size={13}
                      color="#B45309"
                      style={{ marginTop: 2 }}
                    />
                    <Text className="flex-1 font-inter text-xs leading-[18px] text-slate-600">
                      Mess expenses are kept. This{" "}
                      <Text className="font-inter-semibold text-red-600">
                        cannot be undone
                      </Text>
                      .
                    </Text>
                  </View>
                </View>

                {/* Verification */}
                <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <Text className="font-inter-medium text-xs text-slate-600">
                    Type this code exactly to confirm:
                  </Text>
                  <View className="mt-2 items-center rounded-xl border border-dashed border-red-300 bg-white py-2.5">
                    <Text
                      selectable={false}
                      style={{ fontFamily: MONO_FONT, letterSpacing: 5 }}
                      className="text-[22px] font-bold text-red-600"
                      accessibilityLabel={`Confirmation code ${code.split("").join(" ")}`}
                    >
                      {code}
                    </Text>
                  </View>
                  <TextInput
                    value={typed}
                    onChangeText={(text) =>
                      setTyped(text.slice(0, CODE_LENGTH))
                    }
                    editable={!loading}
                    placeholder="Enter code"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoComplete="off"
                    spellCheck={false}
                    contextMenuHidden
                    maxLength={CODE_LENGTH}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    style={{ fontFamily: MONO_FONT, letterSpacing: 4 }}
                    className={`mt-2.5 rounded-xl border-2 bg-white px-3 py-2.5 text-center text-lg text-slate-900 ${
                      matches
                        ? "border-emerald-500"
                        : showMismatch
                          ? "border-red-500"
                          : "border-slate-200"
                    }`}
                  />
                  <View className="mt-1.5 h-4 flex-row items-center justify-center gap-1">
                    {matches ? (
                      <>
                        <Feather
                          name="check-circle"
                          size={12}
                          color="#059669"
                        />
                        <Text className="font-inter-medium text-[11px] text-emerald-600">
                          Code matches
                        </Text>
                      </>
                    ) : showMismatch ? (
                      <>
                        <Feather name="x-circle" size={12} color="#DC2626" />
                        <Text className="font-inter-medium text-[11px] text-red-600">
                          Code does not match (case-sensitive)
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>

                {/* Actions */}
                <View className="mt-4 flex-row gap-2.5">
                  <TouchableOpacity
                    className={`flex-1 items-center rounded-xl border border-slate-200 bg-slate-100 py-[13px] ${
                      loading ? "opacity-50" : ""
                    }`}
                    onPress={cancel}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Text className="font-inter-semibold text-[15px] text-slate-900">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-[13px] ${
                      canDelete || loading ? "bg-red-600" : "bg-red-300"
                    }`}
                    onPress={() => {
                      // The button is disabled too; this guards a tap that
                      // lands in the same frame the code stops matching.
                      if (!canDelete) return;
                      Keyboard.dismiss();
                      onConfirm();
                    }}
                    disabled={!canDelete}
                    activeOpacity={0.7}
                    accessibilityState={{ disabled: !canDelete }}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="trash-2" size={16} color="#FFFFFF" />
                    )}
                    <Text className="font-inter-semibold text-[15px] text-white">
                      {loading ? "Deleting..." : "Delete"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
