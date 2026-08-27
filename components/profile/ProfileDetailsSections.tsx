import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Platform } from "react-native";

import { useAuth } from "@/redux/hooks";
import type { ProfileEditField } from "@/types/profile";

import { DeleteAccountModal } from "./DeleteAccountModal";
import { MessKeyRow } from "./MessKeyRow";
import { ProfileInviteRow } from "./ProfileInviteRow";
import {
  ProfileEditableRow,
  ProfileDestructiveRow,
  ProfileEditRow,
  ProfileRow,
} from "./ProfileRows";
import { ProfileSectionCard } from "./ProfileSectionCard";

export const ProfileDetailsSections = () => {
  const { user, mess, role, updateProfileName, updateMessName } = useAuth();
  const [editing, setEditing] = useState<ProfileEditField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const isAdmin = role === "admin";

  const startEdit = (field: ProfileEditField) => {
    setEditValue(field === "name" ? displayName : (mess?.name ?? ""));
    setEditError("");
    setEditing(field);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue("");
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    const value = editValue.trim();
    if (!value) {
      setEditError("This field cannot be empty.");
      return;
    }
    if (value.length > 100) {
      setEditError("Too long (max 100 characters).");
      return;
    }

    setEditSaving(true);
    setEditError("");
    try {
      if (editing === "name") await updateProfileName(value);
      else await updateMessName(value);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      setEditing(null);
      setEditValue("");
    } catch (caughtError) {
      setEditError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to save. Please try again.",
      );
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
      <ProfileSectionCard title="Account">
        {editing === "name" ? (
          <ProfileEditRow
            icon="user"
            label="Name"
            value={editValue}
            onChange={setEditValue}
            onSave={() => void saveEdit()}
            onCancel={cancelEdit}
            saving={editSaving}
            error={editError}
            showDivider
          />
        ) : (
          <ProfileEditableRow
            icon="user"
            label="Name"
            value={displayName}
            onEdit={() => startEdit("name")}
            showDivider
          />
        )}
        <ProfileRow
          icon="mail"
          label="Email"
          value={displayEmail}
          showDivider
        />
        <ProfileDestructiveRow
          icon="trash-2"
          label="Delete Account"
          description="Permanently remove your account"
          onPress={() => setDeleteModalVisible(true)}
        />
      </ProfileSectionCard>

      {mess && (
        <ProfileSectionCard title="Mess">
          {editing === "mess" ? (
            <ProfileEditRow
              icon="home"
              label="Mess Name"
              value={editValue}
              onChange={setEditValue}
              onSave={() => void saveEdit()}
              onCancel={cancelEdit}
              saving={editSaving}
              error={editError}
              showDivider
            />
          ) : (
            <ProfileEditableRow
              icon="home"
              label="Mess Name"
              value={mess.name}
              onEdit={isAdmin ? () => startEdit("mess") : undefined}
              showDivider
            />
          )}
          <MessKeyRow />
          <ProfileInviteRow />
          <ProfileRow
            icon="shield"
            label="Your Role"
            value={
              isAdmin
                ? "Admin \u2014 can edit data"
                : "Member \u2014 view only"
            }
            valueClassName={
              isAdmin ? "text-emerald-600" : "text-slate-500"
            }
          />
        </ProfileSectionCard>
      )}
      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
      />
    </>
  );
};
