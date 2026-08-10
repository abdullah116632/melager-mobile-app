import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNetwork } from "@/context/NetworkContext";

const BANNER_BODY_HEIGHT = 40;
const SLIDE_BUFFER = 8;

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useNetwork();
  const insets = useSafeAreaInsets();
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const [justSynced, setJustSynced] = useState(false);
  const justSyncedRef = useRef(false);

  const showBanner = !isOnline || isSyncing || pendingCount > 0 || justSynced;
  const topInset = Platform.OS === "web" ? 0 : insets.top;
  const bannerHeight = BANNER_BODY_HEIGHT + topInset;
  const hiddenOffset = -(bannerHeight + SLIDE_BUFFER);

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: showBanner ? 0 : hiddenOffset,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [hiddenOffset, showBanner, slideAnimation]);

  useEffect(() => {
    if (isSyncing) return;
    if (justSyncedRef.current && pendingCount === 0 && isOnline) {
      setJustSynced(true);
      const timeout = setTimeout(() => {
        setJustSynced(false);
        justSyncedRef.current = false;
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, isSyncing, pendingCount]);

  useEffect(() => {
    if (isSyncing) {
      justSyncedRef.current = true;
    }
  }, [isSyncing]);

  let icon: "wifi-off" | "refresh-cw" | "check-circle" = "wifi-off";
  let label = "You're offline";
  let backgroundClassName = "bg-amber-700";

  if (!isOnline && pendingCount > 0) {
    label = `Offline · ${pendingCount} change${pendingCount !== 1 ? "s" : ""} will sync when you reconnect`;
  } else if (!isOnline) {
    label = "You're offline — changes will sync when you reconnect";
  } else if (isSyncing) {
    icon = "refresh-cw";
    label = `Syncing ${pendingCount} change${pendingCount !== 1 ? "s" : ""}…`;
    backgroundClassName = "bg-blue-700";
  } else if (justSynced) {
    icon = "check-circle";
    label = "All changes synced";
    backgroundClassName = "bg-emerald-800";
  } else if (pendingCount > 0) {
    icon = "refresh-cw";
    label = `${pendingCount} change${pendingCount !== 1 ? "s" : ""} waiting to sync`;
    backgroundClassName = "bg-amber-800";
  }

  return (
    <Animated.View
      pointerEvents={showBanner ? "auto" : "none"}
      className={`absolute inset-x-0 top-0 z-[9999] justify-end ${backgroundClassName}`}
      style={{
        height: bannerHeight,
        paddingTop: topInset,
        transform: [{ translateY: slideAnimation }],
      }}
    >
      <View className="flex-row items-center gap-[7px] px-3.5 pb-2">
        <Feather name={icon} size={13} color="#fff" />
        <Text
          className="flex-1 font-inter-semibold text-xs text-white"
          numberOfLines={1}
        >
          {label}
        </Text>
        {isOnline && pendingCount > 0 && !isSyncing && (
          <TouchableOpacity
            className="rounded-md bg-white/20 px-2.5 py-[3px]"
            onPress={syncNow}
            activeOpacity={0.8}
          >
            <Text className="font-inter-bold text-[11px] text-white">
              Sync now
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
