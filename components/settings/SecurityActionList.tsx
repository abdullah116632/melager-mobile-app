import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import type { ComponentProps } from "react";
import { useState } from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { MessKeyRow } from "@/components/profile/MessKeyRow";
import {
  ProfileEditableRow,
  ProfileEditRow,
} from "@/components/profile/ProfileRows";
import { ProfileSectionCard } from "@/components/profile/ProfileSectionCard";
import { useAuth } from "@/redux/hooks";
import type { SecurityModalType } from "@/types/security";

type ActionModal = Exclude<SecurityModalType, null>;
type IconName = ComponentProps<typeof Feather>["name"];

interface SecurityActionListProps {
  onOpen: (modal: ActionModal) => void;
}

interface SecurityActionProps {
  icon: IconName;
  iconClassName: string;
  iconColor: string;
  title: string;
  description: string;
  onPress: () => void;
  warning?: boolean;
  danger?: boolean;
}

const SecurityAction = ({
  icon,
  iconClassName,
  iconColor,
  title,
  description,
  onPress,
  warning = false,
  danger = false,
}: SecurityActionProps) => (
  <TouchableOpacity
    className={`mb-3 flex-row items-center gap-3.5 rounded-2xl border p-4 shadow-sm ${danger ? "border-red-200 bg-red-50/50 shadow-red-200/30" : warning ? "border-amber-200 bg-amber-50/40 shadow-amber-200/30" : "border-slate-200 bg-white shadow-slate-300/40"}`}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View
      className={`h-10 w-10 items-center justify-center rounded-[10px] ${iconClassName}`}
    >
      <Feather name={icon} size={18} color={iconColor} />
    </View>
    <View className="flex-1">
      <Text className="mb-0.5 font-inter-semibold text-[15px] text-slate-900">
        {title}
      </Text>
      <Text className="font-inter text-xs text-slate-500">{description}</Text>
    </View>
    <Feather name="chevron-right" size={18} color="#64748B" />
  </TouchableOpacity>
);

export const SecurityActionList = ({ onOpen }: SecurityActionListProps) => {
  const { mess, role, updateMessName } = useAuth();
  const isAdmin = role === "admin";

  const [editingMessName, setEditingMessName] = useState(false);
  const [messNameValue, setMessNameValue] = useState("");
  const [savingMessName, setSavingMessName] = useState(false);
  const [messNameError, setMessNameError] = useState("");

  const startEditMessName = () => {
    setMessNameValue(mess?.name ?? "");
    setMessNameError("");
    setEditingMessName(true);
  };

  const cancelEditMessName = () => {
    setEditingMessName(false);
    setMessNameValue("");
    setMessNameError("");
  };

  const saveMessName = async () => {
    const value = messNameValue.trim();
    if (!value) {
      setMessNameError("This field cannot be empty.");
      return;
    }
    if (value.length > 100) {
      setMessNameError("Too long (max 100 characters).");
      return;
    }

    setSavingMessName(true);
    setMessNameError("");
    try {
      await updateMessName(value);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      setEditingMessName(false);
      setMessNameValue("");
    } catch (caughtError) {
      setMessNameError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to save. Please try again.",
      );
    } finally {
      setSavingMessName(false);
    }
  };

  if (!mess) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <Feather name="home" size={24} color="#94A3B8" />
        </View>
        <Text className="mt-4 text-center font-inter-semibold text-[15px] text-slate-700">
          No mess selected
        </Text>
        <Text className="mt-1.5 text-center font-inter text-xs leading-5 text-slate-500">
          Join or select a mess to see its settings here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="gap-5 p-4 pb-safe-offset-6"
    >
      <ProfileSectionCard title="Mess Information">
        {editingMessName ? (
          <ProfileEditRow
            icon="home"
            label="Mess Name"
            value={messNameValue}
            onChange={setMessNameValue}
            onSave={() => void saveMessName()}
            onCancel={cancelEditMessName}
            saving={savingMessName}
            error={messNameError}
            showDivider
          />
        ) : (
          <ProfileEditableRow
            icon="home"
            label="Mess Name"
            value={mess.name}
            onEdit={isAdmin ? startEditMessName : undefined}
            showDivider
          />
        )}
        <MessKeyRow />
      </ProfileSectionCard>

      {isAdmin && (
        <View>
          <Text className="mb-2.5 ml-1 font-inter-semibold text-[11px] tracking-[1px] text-slate-500">
            ADMIN CONTROLS
          </Text>
          <SecurityAction
            icon="user-check"
            iconClassName="bg-blue-50"
            iconColor="#2563EB"
            title="Add New Admin"
            description="Grant admin to a member, keep yours"
            onPress={() => onOpen("addCoAdmin")}
          />
          <SecurityAction
            icon="shield"
            iconClassName="bg-orange-50"
            iconColor="#EA580C"
            title="Transfer Admin Role"
            description="Make another member the admin"
            warning
            onPress={() => onOpen("transferAdmin")}
          />
          <SecurityAction
            icon="user-minus"
            iconClassName="bg-red-100"
            iconColor="#DC2626"
            title="Remove My Admin Role"
            description="Continue in this mess as a regular member"
            danger
            onPress={() => onOpen("leaveAdmin")}
          />
        </View>
      )}
    </ScrollView>
  );
};
