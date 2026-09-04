import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth, useNotifications } from "@/redux/hooks";
import { api } from "@/lib/api";
import type { AppNotification } from "@/types/notification";

const timeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const NotificationIcon = ({ type }: { type: AppNotification["type"] }) => {
  if (type === "member_request") {
    return (
      <View className="h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-blue-100">
        <Feather name="user-plus" size={16} color="#1D4ED8" />
      </View>
    );
  }

  if (type === "bazar_assignment") {
    return (
      <View className="h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-orange-100">
        <Feather name="shopping-cart" size={16} color="#C2410C" />
      </View>
    );
  }

  if (type === "notice") {
    return (
      <View className="h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-amber-100">
        <Feather name="clipboard" size={16} color="#B45309" />
      </View>
    );
  }

  if (type === "message") {
    return (
      <View className="h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-sky-100">
        <Feather name="message-circle" size={16} color="#0369A1" />
      </View>
    );
  }

  if (type === "menu") {
    return (
      <View className="h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-teal-100">
        <Feather name="coffee" size={16} color="#0F766E" />
      </View>
    );
  }

  return (
    <View className="h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-amber-100">
      <Feather name="coffee" size={16} color="#B45309" />
    </View>
  );
};

const NotificationItem = ({ item }: { item: AppNotification }) => {
  const router = useRouter();
  const { markRead, closePanel } = useNotifications();
  const { token } = useAuth();

  const handlePress = useCallback(() => {
    markRead(item.id);
    if (token && item.id.startsWith("server_")) {
      const notificationId = Number(item.id.slice("server_".length));
      if (Number.isInteger(notificationId)) {
        void api
          .markServerNotificationRead(notificationId, token)
          .catch(() => undefined);
      }
    }
    closePanel();
    router.push(item.route as never);
  }, [closePanel, item, markRead, router, token]);

  return (
    <TouchableOpacity
      className={`flex-row items-center gap-3 border-b-[0.5px] border-slate-200 px-4 py-[13px] ${item.read ? "bg-white" : "bg-slate-50"}`}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <NotificationIcon type={item.type} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="flex-1 font-inter-semibold text-sm text-slate-900"
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.read && (
            <View className="h-2 w-2 shrink-0 rounded-full bg-teal-700" />
          )}
        </View>
        <Text
          className="font-inter text-[13px] leading-[18px] text-slate-500"
          numberOfLines={2}
        >
          {item.body}
        </Text>
        <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
          {timeAgo(item.timestamp)}
        </Text>
      </View>
      <View className="ml-1">
        <Feather name="chevron-right" size={14} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
};

export function NotificationPanel() {
  const { notifications, unreadCount, markAllRead, panelVisible, closePanel } =
    useNotifications();

  return (
    <Modal
      visible={panelVisible}
      transparent
      animationType="slide"
      onRequestClose={closePanel}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="absolute inset-0" onPress={closePanel} />
        <View
          className={`max-h-[80%] min-h-[300px] rounded-t-[20px] bg-white shadow-2xl shadow-black/15 ${Platform.OS === "web" ? "pb-4" : "pb-safe-offset-2"}`}
        >
          <View className="mb-1 mt-2.5 h-1 w-10 self-center rounded-sm bg-slate-200" />

          <View className="flex-row items-center justify-between border-b-[0.5px] border-slate-200 px-4 py-3.5">
            <View className="flex-row items-center gap-2">
              <Feather name="bell" size={18} color="#0F172A" />
              <Text className="font-inter-bold text-[17px] text-slate-900">
                Notifications
              </Text>
              {unreadCount > 0 && (
                <View className="h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-[5px]">
                  <Text className="font-inter-bold text-[11px] text-white">
                    {unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-3">
              {unreadCount > 0 && (
                <TouchableOpacity
                  className="rounded-lg bg-teal-50 px-2.5 py-[5px]"
                  onPress={markAllRead}
                  activeOpacity={0.7}
                >
                  <Text className="font-inter-semibold text-xs text-teal-700">
                    Mark all read
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={closePanel}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {notifications.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-2.5 p-10">
              <Feather name="bell-off" size={40} color="#64748B" />
              <Text className="mt-2 font-inter-semibold text-base text-slate-900">
                No notifications yet
              </Text>
              <Text className="text-center font-inter text-[13px] leading-5 text-slate-500">
                You&apos;ll be notified when members join or change their meal
                status.
              </Text>
            </View>
          ) : (
            <FlatList
              className="flex-1"
              data={notifications}
              keyExtractor={(notification) => notification.id}
              renderItem={({ item }) => <NotificationItem item={item} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
