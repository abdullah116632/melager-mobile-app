import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Platform } from "react-native";

import { ChangePasswordForm } from "@/components/settings/ChangePasswordForm";
import { SecurityBottomSheet } from "@/components/settings/SecurityBottomSheet";
import { UpdateEmailForm } from "@/components/settings/UpdateEmailForm";
import { useAuth, useMess } from "@/redux/hooks";
import type { ProfileSecurityModalType } from "@/types/security";

import { DeleteAccountModal } from "./DeleteAccountModal";
import {
  ProfileActionRow,
  ProfileEditableRow,
  ProfileDestructiveRow,
  ProfileEditRow,
  ProfileRow,
} from "./ProfileRows";
import { ProfileSectionCard } from "./ProfileSectionCard";

export const ProfileDetailsSections = () => {
  const { user, mess, role, updateProfileName } = useAuth();
  const { refreshConsumers } = useMess();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [activeModal, setActiveModal] = useState<ProfileSecurityModalType>(null);
  const closeModal = () => setActiveModal(null);
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const isAdmin = role === "admin";

  const startEditName = () => {
    setNameValue(displayName);
    setNameError("");
    setEditingName(true);
  };

  const cancelEditName = () => {
    setEditingName(false);
    setNameValue("");
    setNameError("");
  };

  const saveNameEdit = async () => {
    const value = nameValue.trim();
    if (!value) {
      setNameError("This field cannot be empty.");
      return;
    }
    if (value.length > 100) {
      setNameError("Too long (max 100 characters).");
      return;
    }

    setNameSaving(true);
    setNameError("");
    try {
      await updateProfileName(value);
      await refreshConsumers().catch(() => undefined);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      setEditingName(false);
      setNameValue("");
    } catch (caughtError) {
      setNameError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to save. Please try again.",
      );
    } finally {
      setNameSaving(false);
    }
  };

  return (
    <>
      <ProfileSectionCard title="Account">
        {editingName ? (
          <ProfileEditRow
            icon="user"
            label="Name"
            value={nameValue}
            onChange={setNameValue}
            onSave={() => void saveNameEdit()}
            onCancel={cancelEditName}
            saving={nameSaving}
            error={nameError}
            showDivider
          />
        ) : (
          <ProfileEditableRow
            icon="user"
            label="Name"
            value={displayName}
            onEdit={startEditName}
            showDivider
          />
        )}
        {mess && (
          <ProfileRow
            icon="shield"
            label="Your Role"
            value={
              isAdmin ? "Admin (can edit data)" : "Member (view only)"
            }
            valueClassName={isAdmin ? "text-emerald-600" : "text-slate-500"}
            showDivider
          />
        )}
        <ProfileRow
          icon="mail"
          label="Email"
          value={displayEmail}
          showDivider
        />
        <ProfileActionRow
          icon="lock"
          label="Change Password"
          description="Update your account password"
          onPress={() => setActiveModal("changePassword")}
          showDivider
        />
        <ProfileActionRow
          icon="at-sign"
          label="Update Email"
          description="Change your login email address"
          onPress={() => setActiveModal("updateEmail")}
          showDivider
        />
        <ProfileDestructiveRow
          icon="trash-2"
          label="Delete Account"
          description="Permanently remove your account"
          onPress={() => setDeleteModalVisible(true)}
        />
      </ProfileSectionCard>

      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
      />
      <SecurityBottomSheet
        visible={activeModal !== null}
        canClose
        onClose={closeModal}
      >
        {activeModal === "changePassword" ? (
          <ChangePasswordForm onClose={closeModal} />
        ) : activeModal === "updateEmail" ? (
          <UpdateEmailForm onClose={closeModal} />
        ) : null}
      </SecurityBottomSheet>
    </>
  );
};
