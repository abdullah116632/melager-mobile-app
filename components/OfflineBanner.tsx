import Feather from '@expo/vector-icons/Feather';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetwork } from '@/context/NetworkContext';

// Single source of truth for the banner geometry. Used both for styling and
// for the slide-off-screen animation so the banner fully leaves the viewport
// regardless of the device's top safe-area inset.
const BANNER_BODY = 40;
const SLIDE_BUFFER = 8; // extra px so shadow/blur can't leak above the top

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useNetwork();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [justSynced, setJustSynced] = useState(false);
  const justSyncedRef = useRef(false);

  const showBanner = !isOnline || isSyncing || pendingCount > 0 || justSynced;
  const topInset = Platform.OS !== 'web' ? insets.top : 0;
  const bannerHeight = BANNER_BODY + topInset;
  // Slide the banner up by its own full height (plus a small buffer) so it is
  // completely hidden once the network comes back, even on devices with a tall
  // safe-area inset (notch, Dynamic Island, status bar).
  const hiddenOffset = -(bannerHeight + SLIDE_BUFFER);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showBanner ? 0 : hiddenOffset,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [showBanner, hiddenOffset, slideAnim]);

  useEffect(() => {
    if (isSyncing) return;
    if (justSyncedRef.current && pendingCount === 0 && isOnline) {
      setJustSynced(true);
      const t = setTimeout(() => {
        setJustSynced(false);
        justSyncedRef.current = false;
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [isSyncing, pendingCount, isOnline]);

  useEffect(() => {
    if (isSyncing) {
      justSyncedRef.current = true;
    }
  }, [isSyncing]);

  let icon: 'wifi-off' | 'refresh-cw' | 'check-circle' = 'wifi-off';
  let label = "You're offline";
  let bg = '#B45309';

  if (!isOnline && pendingCount > 0) {
    icon = 'wifi-off';
    label = `Offline · ${pendingCount} change${pendingCount !== 1 ? 's' : ''} will sync when you reconnect`;
    bg = '#B45309';
  } else if (!isOnline) {
    icon = 'wifi-off';
    label = "You're offline — changes will sync when you reconnect";
    bg = '#B45309';
  } else if (isSyncing) {
    icon = 'refresh-cw';
    label = `Syncing ${pendingCount} change${pendingCount !== 1 ? 's' : ''}…`;
    bg = '#1D4ED8';
  } else if (justSynced) {
    icon = 'check-circle';
    label = 'All changes synced';
    bg = '#065F46';
  } else if (pendingCount > 0) {
    icon = 'refresh-cw';
    label = `${pendingCount} change${pendingCount !== 1 ? 's' : ''} waiting to sync`;
    bg = '#92400E';
  }

  return (
    <Animated.View
      pointerEvents={showBanner ? 'auto' : 'none'}
      style={[
        styles.banner,
        {
          backgroundColor: bg,
          height: bannerHeight,
          paddingTop: topInset,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.inner}>
        <Feather name={icon} size={13} color="#fff" />
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {isOnline && pendingCount > 0 && !isSyncing && (
          <TouchableOpacity onPress={syncNow} style={styles.syncBtn} activeOpacity={0.8}>
            <Text style={styles.syncText}>Sync now</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    justifyContent: 'flex-end',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 7,
  },
  label: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  syncBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 6,
  },
  syncText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
