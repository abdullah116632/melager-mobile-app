import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type AppNotification, useNotifications } from '@/context/NotificationContext';
import { useColors } from '@/hooks/useColors';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  if (type === 'member_request') {
    return (
      <View style={[styles.icon, { backgroundColor: '#DBEAFE' }]}>
        <Feather name="user-plus" size={16} color="#1D4ED8" />
      </View>
    );
  }
  return (
    <View style={[styles.icon, { backgroundColor: '#FEF3C7' }]}>
      <Feather name="coffee" size={16} color="#B45309" />
    </View>
  );
}

function NotifItem({ item }: { item: AppNotification }) {
  const router = useRouter();
  const { markRead, closePanel } = useNotifications();
  const colors = useColors();

  const handlePress = useCallback(() => {
    markRead(item.id);
    closePanel();
    router.push(item.route as never);
  }, [item, markRead, closePanel, router]);

  return (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: item.read ? colors.card : colors.background,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <NotifIcon type={item.type} />
      <View style={styles.itemBody}>
        <View style={styles.itemTop}>
          <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.dot} />}
        </View>
        <Text style={[styles.itemBody2, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>
          {timeAgo(item.timestamp)}
        </Text>
      </View>
      <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

export function NotificationPanel() {
  const { notifications, unreadCount, markAllRead, panelVisible, closePanel } = useNotifications();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={panelVisible}
      transparent
      animationType="slide"
      onRequestClose={closePanel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closePanel} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Platform.OS !== 'web' ? insets.bottom + 8 : 16,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <Feather name="bell" size={18} color={colors.foreground} />
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead} style={styles.markBtn} activeOpacity={0.7}>
                  <Text style={styles.markBtnText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={closePanel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="bell-off" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications yet</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                You'll be notified when members join or change their meal status.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(n) => n.id}
              renderItem={({ item }) => <NotifItem item={item} />}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
  },
  markBtnText: {
    color: '#0F766E',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0F766E',
    flexShrink: 0,
  },
  itemBody2: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  itemTime: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
