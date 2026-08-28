import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

export const RemoveMemberConfirmModal = ({
  member,
  loading,
  onCancel,
  onConfirm,
}: RemoveMemberConfirmModalProps) => {
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);

  useEffect(() => {
    if (!member) setShowFinalConfirmation(false);
  }, [member]);

  return (
    <>
      <Modal
        visible={member !== null && !showFinalConfirmation}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
      >
        <View className="flex-1 items-center justify-center bg-black/45 p-6">
          <View className="w-full max-w-[360px] items-center rounded-[20px] border border-slate-200 bg-white p-6 shadow-2xl shadow-black/15">
            <View className="mb-4 h-[54px] w-[54px] items-center justify-center rounded-2xl bg-red-50">
              <Feather name="user-minus" size={23} color="#DC2626" />
            </View>
            <Text className="text-center font-inter-bold text-lg text-slate-900">
              Remove Member?
            </Text>
            <Text className="mt-2 text-center font-inter text-sm leading-5 text-slate-500">
              Remove{" "}
              <Text className="font-inter-semibold text-slate-900">
                {member?.name}
              </Text>{" "}
              from this mess?
            </Text>
            <Text className="mt-2 text-center font-inter-medium text-xs leading-[18px] text-red-600">
              Their meals and deposits in this mess will also be removed.
            </Text>
            <View className="mt-5 w-full flex-row gap-2.5">
              <TouchableOpacity
                className="flex-1 items-center rounded-xl border border-slate-200 bg-slate-100 py-[13px]"
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text className="font-inter-semibold text-[15px] text-slate-900">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-red-600 py-[13px]"
                onPress={() => setShowFinalConfirmation(true)}
                activeOpacity={0.7}
              >
                <Feather name="user-minus" size={16} color="#FFFFFF" />
                <Text className="font-inter-semibold text-[15px] text-white">
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={member !== null && showFinalConfirmation}
        transparent
        animationType="fade"
        onRequestClose={
          loading ? undefined : () => setShowFinalConfirmation(false)
        }
      >
        <View className="flex-1 items-center justify-center bg-black/55 p-6">
          <View className="w-full max-w-[350px] items-center rounded-[20px] border border-red-100 bg-white p-6 shadow-2xl shadow-black/20">
            <View className="mb-4 h-[54px] w-[54px] items-center justify-center rounded-full bg-red-100">
              <Feather name="alert-triangle" size={24} color="#DC2626" />
            </View>
            <Text className="text-center font-inter-bold text-xl text-slate-900">
              Are you sure?
            </Text>
            <Text className="mt-2 text-center font-inter text-sm leading-5 text-slate-500">
              This will permanently remove{" "}
              <Text className="font-inter-semibold text-slate-900">
                {member?.name}
              </Text>{" "}
              and cannot be undone.
            </Text>
            <View className="mt-5 w-full flex-row gap-2.5">
              <TouchableOpacity
                className={`flex-1 items-center rounded-xl border border-slate-200 bg-slate-100 py-[13px] ${loading ? "opacity-50" : "opacity-100"}`}
                onPress={() => setShowFinalConfirmation(false)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text className="font-inter-semibold text-[15px] text-slate-900">
                  Go Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-red-600 py-[13px] ${loading ? "opacity-75" : "opacity-100"}`}
                onPress={onConfirm}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="trash-2" size={16} color="#FFFFFF" />
                )}
                <Text className="font-inter-semibold text-[15px] text-white">
                  {loading ? "Removing..." : "Yes, Remove"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};
