import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useNotifications } from '@/context/NotificationContext';

interface NotificationBellProps {
  badgeBorderColor?: string;
}

export function NotificationBell({ badgeBorderColor = '#0F766E' }: NotificationBellProps) {
  const { unreadCount, openPanel } = useNotifications();
  const badgeCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={openPanel}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Feather name="bell" size={22} color="#fff" />
      {unreadCount > 0 && (
        <View style={[styles.badge, { borderColor: badgeBorderColor }]}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: -1,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    lineHeight: 12,
  },
});
