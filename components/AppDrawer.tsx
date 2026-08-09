import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Clipboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useDrawer } from '@/context/DrawerContext';

const DRAWER_W = 290;
const ANIM_MS = 220;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

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

// ── Main Drawer ──────────────────────────────────────────────────────────────

export function AppDrawer() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, mess, role, token, logout, exitMess } = useAuth();
  const { isOpen, closeDrawer } = useDrawer();
  const router = useRouter();

  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIM_MS,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIM_MS,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_W,
          duration: ANIM_MS,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: ANIM_MS,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(() => setVisible(false));
    }
  }, [isOpen]);

  const handleCopyKey = () => {
    if (!mess?.messKey) return;
    Clipboard.setString(mess.messKey);
    setKeyCopied(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const nav = (path: string) => {
    closeDrawer();
    setTimeout(() => router.navigate(path as any), 50);
  };

  const handleLogout = async () => {
    closeDrawer();
    setTimeout(async () => {
      setLoggingOut(true);
      try {
        await logout();
      } finally {
        setLoggingOut(false);
      }
    }, ANIM_MS + 50);
  };

  if (!visible) return null;

  const displayName = user?.name ?? 'User';
  const displayEmail = user?.email ?? '';
  const avBg = avatarColor(displayName);
  const isAdmin = role === 'admin';
  const topPad = Platform.OS === 'web' ? 20 : insets.top;
  const botPad = Platform.OS === 'web' ? 24 : Math.max(insets.bottom, 16);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={closeDrawer}>
      {/* Semi-transparent backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={[StyleSheet.absoluteFill, styles.backdrop]} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.card,
            paddingTop: topPad,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* ── Profile header ────────────────────────────────────────────── */}
        <View style={[styles.profileSection, { backgroundColor: colors.primary }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={closeDrawer}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <View style={[styles.avatar, { backgroundColor: avBg }]}>
            <Text style={styles.avatarText}>{initials(displayName)}</Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor: isAdmin
                  ? 'rgba(255,255,255,0.25)'
                  : 'rgba(255,255,255,0.15)',
              },
            ]}
          >
            <Text style={styles.roleBadgeText}>{isAdmin ? 'Admin' : 'Member'}</Text>
          </View>
        </View>

        {/* ── Scrollable content ────────────────────────────────────────── */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Mess info */}
          {mess && (
            <>
              <SectionLabel label="MESS" colors={colors} />
              <DrawerRow icon="home" label={mess.name} sublabel="Mess name" colors={colors} />
              <View style={[styles.keyRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.rowIconWrap, { backgroundColor: colors.secondary }]}>
                  <Feather name="key" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowSubLabel, { color: colors.mutedForeground }]}>Mess Key</Text>
                  <Text style={[styles.keyValue, { color: colors.foreground }]}>{mess.messKey}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.copyBtn,
                    { backgroundColor: keyCopied ? '#059669' : colors.secondary },
                  ]}
                  onPress={handleCopyKey}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={keyCopied ? 'check' : 'copy'}
                    size={14}
                    color={keyCopied ? '#fff' : colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Navigation menu */}
          <SectionLabel label="MENU" colors={colors} />
          {isAdmin && (
            <DrawerRow
              icon="users"
              label="Member Requests"
              sublabel="Review join requests"
              colors={colors}
              onPress={() => nav('/member-requests')}
              showChevron
            />
          )}
          {isAdmin && (
            <DrawerRow
              icon="list"
              label="Consumers"
              sublabel="View all members & contacts"
              colors={colors}
              onPress={() => nav('/consumers')}
              showChevron
            />
          )}
          <DrawerRow
            icon="user"
            label="Profile"
            sublabel="View your account"
            colors={colors}
            onPress={() => nav('/(tabs)/profile')}
            showChevron
          />
          <DrawerRow
            icon="grid"
            label="Switch Mess"
            sublabel="Go back to mess hub"
            colors={colors}
            onPress={() => { exitMess(); closeDrawer(); }}
            showChevron
          />
          {/* Settings */}
          <SectionLabel label="SETTINGS" colors={colors} />
          <DrawerRow
            icon="shield"
            label="Security"
            sublabel="Password, email & admin"
            colors={colors}
            onPress={() => nav('/settings/security')}
            showChevron
          />
        </ScrollView>

        {/* ── Logout + version ─────────────────────────────────────────── */}
        <View style={[styles.logoutSection, { borderTopColor: colors.border, paddingBottom: botPad }]}>
          <TouchableOpacity
            style={[styles.logoutBtn, { opacity: loggingOut ? 0.6 : 1 }]}
            onPress={handleLogout}
            disabled={loggingOut}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={18} color="#fff" />
            <Text style={styles.logoutText}>{loggingOut ? 'Logging out…' : 'Log Out'}</Text>
          </TouchableOpacity>
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
            Mess Manager v1.0.0
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>
  );
}

interface DrawerRowProps {
  icon: string;
  label: string;
  sublabel?: string;
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
  showChevron?: boolean;
}

function DrawerRow({ icon, label, sublabel, colors, onPress, showChevron }: DrawerRowProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.drawerRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.rowSubLabel, { color: colors.mutedForeground }]}>{sublabel}</Text>
        ) : null}
      </View>
      {showChevron ? (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      ) : null}
    </Wrapper>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_W,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },

  // Profile header
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 6,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  userName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },

  // Section label
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },

  // Rows
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  rowSubLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  keyValue: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Logout
  logoutSection: {
    borderTopWidth: 1,
    padding: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  versionText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 10,
  },
});
