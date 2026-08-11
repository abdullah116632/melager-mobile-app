import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Clipboard,
  Platform,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { MessKeyRow } from "@/components/profile/MessKeyRow";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileInviteRow } from "@/components/profile/ProfileInviteRow";
import {
  ProfileEditableRow,
  ProfileEditRow,
  ProfileRow,
} from "@/components/profile/ProfileRows";
import { ProfileSectionCard } from "@/components/profile/ProfileSectionCard";
import { useAuth } from "@/context/AuthContext";
import { sendMessInvite } from "@/services/profileService";
import type { ProfileEditField } from "@/types/profile";
import { isValidInviteEmail } from "@/utils/profile";

export const ProfileScreen = () => {
  const router = useRouter();
  const {
    user,
    mess,
    role,
    token,
    logout,
    updateProfileName,
    updateMessName,
    exitMess,
  } = useAuth();
  const [keyCopied, setKeyCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [editing, setEditing] = useState<ProfileEditField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const isAdmin = role === "admin";
  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";

  const closeInvite = () => {
    setInviting(false);
    setInviteEmail("");
    setInviteError("");
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !isValidInviteEmail(email)) {
      setInviteError("Please enter a valid email address.");
      return;
    }
    if (!mess || !token) return;

    setInviteSending(true);
    setInviteError("");
    try {
      await sendMessInvite(mess.id, email, token);
      setInviteSent(true);
      setInviteEmail("");
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      setTimeout(() => {
        setInviting(false);
        setInviteSent(false);
      }, 2000);
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Failed to send invite.",
      );
    } finally {
      setInviteSending(false);
    }
  };

  const handleCopyKey = () => {
    if (!mess?.messKey) return;
    Clipboard.setString(mess.messKey);
    setKeyCopied(true);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setKeyCopied(false), 2000);
  };

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
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : "Failed to save. Please try again.",
      );
    } finally {
      setEditSaving(false);
    }
  };

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      void performLogout();
      return;
    }
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => void performLogout(),
      },
    ]);
  };

  return (
    <View
      className={`flex-1 bg-teal-700 ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F766E" />
      <View className="flex-1 bg-slate-50">
        <ProfileHeader
          name={displayName}
          email={displayEmail}
          isAdmin={isAdmin}
          onBack={() => router.back()}
        />
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName={`gap-5 pt-5 ${Platform.OS === "web" ? "pb-[118px]" : "pb-safe-offset-[49px]"}`}
          keyboardShouldPersistTaps="handled"
        >
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
            <ProfileRow icon="mail" label="Email" value={displayEmail} />
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
              <MessKeyRow
                messKey={mess.messKey}
                copied={keyCopied}
                onCopy={handleCopyKey}
              />
              {isAdmin && (
                <ProfileInviteRow
                  expanded={inviting}
                  email={inviteEmail}
                  sending={inviteSending}
                  error={inviteError}
                  sent={inviteSent}
                  onOpen={() => {
                    setInviting(true);
                    setInviteError("");
                    setInviteSent(false);
                  }}
                  onClose={closeInvite}
                  onEmailChange={(value) => {
                    setInviteEmail(value);
                    setInviteError("");
                  }}
                  onSubmit={() => void handleSendInvite()}
                />
              )}
              <ProfileRow
                icon="shield"
                label="Your Role"
                value={isAdmin ? "Admin — can edit data" : "Member — view only"}
                valueClassName={isAdmin ? "text-emerald-600" : "text-slate-500"}
              />
            </ProfileSectionCard>
          )}

          <ProfileSectionCard title="About">
            <ProfileRow
              icon="info"
              label="App"
              value="Melager"
              showDivider
            />
            <ProfileRow icon="code" label="Version" value="1.0.0" />
          </ProfileSectionCard>

          <ProfileActions
            loggingOut={loggingOut}
            onSwitchMess={exitMess}
            onLogout={handleLogout}
          />
        </ScrollView>
      </View>
    </View>
  );
};
