import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { api } from '@/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(name: string): string {
  const palette = ['#0D9488', '#0284C7', '#7C3AED', '#DB2777', '#EA580C', '#059669'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, mess, role, token, logout, updateProfileName, updateMessName, exitMess, messes } = useAuth();

  const [keyCopied, setKeyCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Invite state
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  // Edit state — 'name' | 'mess' | null
  const [editing, setEditing] = useState<'name' | 'mess' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 49;

  const isAdmin = role === 'admin';
  const displayName = user?.name ?? 'User';
  const displayEmail = user?.email ?? '';
  const avatarBg = avatarColor(displayName);

  const handleSendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Please enter a valid email address.');
      return;
    }
    if (!mess || !token) return;
    setInviteSending(true);
    setInviteError('');
    try {
      await api.inviteByEmail(mess.id, email, token);
      setInviteSent(true);
      setInviteEmail('');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => { setInviting(false); setInviteSent(false); }, 2000);
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : 'Failed to send invite.');
    } finally {
      setInviteSending(false);
    }
  };

  const handleCopyKey = () => {
    if (!mess?.messKey) return;
    Clipboard.setString(mess.messKey);
    setKeyCopied(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const startEdit = (field: 'name' | 'mess') => {
    setEditValue(field === 'name' ? displayName : (mess?.name ?? ''));
    setEditError('');
    setEditing(field);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue('');
    setEditError('');
  };

  const saveEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditError('This field cannot be empty.'); return; }
    if (trimmed.length > 100) { setEditError('Too long (max 100 characters).'); return; }
    setEditSaving(true);
    setEditError('');
    try {
      if (editing === 'name') {
        await updateProfileName(trimmed);
      } else {
        await updateMessName(trimmed);
      }
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(null);
      setEditValue('');
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Failed to save. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') { doLogout(); return; }
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: doLogout },
    ]);
  };

  const doLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>{initials(displayName)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{displayName}</Text>
          <Text style={styles.headerEmail}>{displayEmail}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: isAdmin ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)' }]}>
          <Text style={styles.roleBadgeText}>{isAdmin ? 'Admin' : 'Member'}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 20, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Account section ─────────────────────────────────────────────── */}
        <SectionCard title="Account" colors={colors}>
          {/* Name — editable */}
          {editing === 'name' ? (
            <EditRow
              icon="user"
              label="Name"
              value={editValue}
              onChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              saving={editSaving}
              error={editError}
              colors={colors}
              showDivider
            />
          ) : (
            <EditableRowItem
              icon="user"
              label="Name"
              value={displayName}
              onEdit={() => startEdit('name')}
              colors={colors}
              showDivider
            />
          )}
          <RowItem
            icon="mail"
            label="Email"
            value={displayEmail}
            colors={colors}
          />
        </SectionCard>

        {/* ── Mess section ─────────────────────────────────────────────────── */}
        {mess && (
          <SectionCard title="Mess" colors={colors}>
            {/* Mess name — editable by admin */}
            {editing === 'mess' ? (
              <EditRow
                icon="home"
                label="Mess Name"
                value={editValue}
                onChange={setEditValue}
                onSave={saveEdit}
                onCancel={cancelEdit}
                saving={editSaving}
                error={editError}
                colors={colors}
                showDivider
              />
            ) : (
              <EditableRowItem
                icon="home"
                label="Mess Name"
                value={mess.name}
                onEdit={isAdmin ? () => startEdit('mess') : undefined}
                colors={colors}
                showDivider
              />
            )}
            {/* Mess Key */}
            <View style={[styles.rowItem, styles.rowDivider, { borderBottomColor: colors.border }]}>
              <View style={[styles.rowIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="key" size={16} color={colors.primary} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Mess Key</Text>
                <Text style={[styles.rowValue, { color: colors.foreground, letterSpacing: 2 }]}>
                  {mess.messKey}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: keyCopied ? '#059669' : colors.secondary }]}
                onPress={handleCopyKey}
                activeOpacity={0.7}
              >
                <Feather name={keyCopied ? 'check' : 'copy'} size={15} color={keyCopied ? '#fff' : colors.primary} />
                <Text style={[styles.actionBtnText, { color: keyCopied ? '#fff' : colors.primary }]}>
                  {keyCopied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Invite via Email — admin only */}
            {isAdmin && (
              <>
                {inviting ? (
                  <View style={[styles.rowDivider, { borderBottomColor: colors.border }]}>
                    <View style={styles.rowItem}>
                      <View style={[styles.rowIconWrap, { backgroundColor: '#EFF6FF' }]}>
                        <Feather name="send" size={16} color="#3B82F6" />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Invite Email</Text>
                        <TextInput
                          autoFocus
                          value={inviteEmail}
                          onChangeText={(v) => { setInviteEmail(v); setInviteError(''); }}
                          onSubmitEditing={handleSendInvite}
                          placeholder="someone@example.com"
                          placeholderTextColor={colors.mutedForeground}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          returnKeyType="send"
                          style={[styles.editInput, { color: colors.foreground, borderBottomColor: '#3B82F6' }]}
                          editable={!inviteSending}
                        />
                      </View>
                      <View style={styles.editActions}>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
                          onPress={() => { setInviting(false); setInviteEmail(''); setInviteError(''); }}
                          disabled={inviteSending}
                          activeOpacity={0.7}
                        >
                          <Feather name="x" size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: inviteSent ? '#059669' : '#3B82F6' }]}
                          onPress={handleSendInvite}
                          disabled={inviteSending || inviteSent}
                          activeOpacity={0.7}
                        >
                          {inviteSending
                            ? <ActivityIndicator size={14} color="#fff" />
                            : <Feather name={inviteSent ? 'check' : 'send'} size={14} color="#fff" />}
                        </TouchableOpacity>
                      </View>
                    </View>
                    {!!inviteError && (
                      <Text style={[styles.editError, { color: '#DC2626' }]}>{inviteError}</Text>
                    )}
                    {inviteSent && (
                      <Text style={[styles.editError, { color: '#059669' }]}>Invite sent!</Text>
                    )}
                  </View>
                ) : (
                  <View style={[styles.rowItem, styles.rowDivider, { borderBottomColor: colors.border }]}>
                    <View style={[styles.rowIconWrap, { backgroundColor: '#EFF6FF' }]}>
                      <Feather name="send" size={16} color="#3B82F6" />
                    </View>
                    <View style={styles.rowContent}>
                      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>Invite Member</Text>
                      <Text style={[styles.rowValue, { color: colors.foreground }]}>Send join key via email</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]}
                      onPress={() => { setInviting(true); setInviteError(''); setInviteSent(false); }}
                      activeOpacity={0.7}
                    >
                      <Feather name="send" size={15} color="#3B82F6" />
                      <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Invite</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
            <RowItem
              icon="shield"
              label="Your Role"
              value={isAdmin ? 'Admin — can edit data' : 'Member — view only'}
              valueColor={isAdmin ? '#059669' : colors.mutedForeground}
              colors={colors}
            />
          </SectionCard>
        )}

        {/* ── About ────────────────────────────────────────────────────────── */}
        <SectionCard title="About" colors={colors}>
          <RowItem icon="info" label="App" value="Mess Manager" colors={colors} showDivider />
          <RowItem icon="code" label="Version" value="1.0.0" colors={colors} />
        </SectionCard>

        {/* ── Switch / Logout ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <TouchableOpacity
            style={styles.switchMessBtn}
            onPress={exitMess}
            activeOpacity={0.8}
          >
            <Feather name="grid" size={18} color="#0F766E" />
            <Text style={styles.switchMessText}>Switch Mess</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logoutBtn, { opacity: loggingOut ? 0.6 : 1 }]}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={loggingOut}
          >
            <Feather name="log-out" size={18} color="#fff" />
            <Text style={styles.logoutText}>{loggingOut ? 'Logging out…' : 'Log Out'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ paddingHorizontal: 16, gap: 6 }}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

interface RowItemProps {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  colors: ReturnType<typeof useColors>;
  showDivider?: boolean;
}

function RowItem({ icon, label, value, valueColor, colors, showDivider }: RowItemProps) {
  return (
    <View style={[styles.rowItem, showDivider && styles.rowDivider, showDivider && { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

function EditableRowItem({
  icon,
  label,
  value,
  onEdit,
  valueColor,
  colors,
  showDivider,
}: RowItemProps & { onEdit?: () => void }) {
  return (
    <View style={[styles.rowItem, showDivider && styles.rowDivider, showDivider && { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: valueColor ?? colors.foreground }]}>{value}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
          onPress={onEdit}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="edit-2" size={14} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EditRow({
  icon,
  label,
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
  colors,
  showDivider,
}: {
  icon: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  colors: ReturnType<typeof useColors>;
  showDivider?: boolean;
}) {
  return (
    <View style={[showDivider && styles.rowDivider, showDivider && { borderBottomColor: colors.border }]}>
      <View style={styles.rowItem}>
        <View style={[styles.rowIconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name={icon as any} size={16} color={colors.primary} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
          <TextInput
            autoFocus
            value={value}
            onChangeText={onChange}
            onSubmitEditing={onSave}
            returnKeyType="done"
            style={[styles.editInput, {
              color: colors.foreground,
              borderBottomColor: colors.primary,
            }]}
            maxLength={100}
            editable={!saving}
          />
        </View>
        <View style={styles.editActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.secondary }]}
            onPress={onCancel}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.primary }]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving
              ? <ActivityIndicator size={14} color="#fff" />
              : <Feather name="check" size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
      {!!error && (
        <Text style={[styles.editError, { color: '#DC2626' }]}>{error}</Text>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  headerEmail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },

  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },

  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  rowValue: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: 1,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },

  editInput: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    borderBottomWidth: 1.5,
    paddingVertical: 2,
    marginTop: 2,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editError: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 14,
    paddingBottom: 10,
    marginTop: -4,
  },

  switchMessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
  },
  switchMessText: {
    color: '#0F766E',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#DC2626',
    paddingVertical: 15,
    borderRadius: 14,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
