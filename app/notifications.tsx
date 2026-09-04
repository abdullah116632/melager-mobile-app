import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "@/lib/api";
import { useAuth, useNotifications } from "@/redux/hooks";
import type { AppNotification } from "@/types/notification";

const formatNotificationTime = (timestamp: number) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const NotificationIcon = ({ type }: { type: AppNotification["type"] }) => {
  const icon =
    type === "bazar_assignment"
      ? "shopping-cart"
      : type === "member_request"
        ? "user-plus"
        : type === "notice"
          ? "clipboard"
          : "coffee";
  const color =
    type === "bazar_assignment"
      ? "#C2410C"
      : type === "member_request"
        ? "#1D4ED8"
        : type === "notice"
          ? "#B45309"
          : "#0F766E";
  const background =
    type === "bazar_assignment"
      ? "bg-orange-100"
      : type === "member_request"
        ? "bg-blue-100"
        : type === "notice"
          ? "bg-amber-100"
          : "bg-teal-100";

  return (
    <View
      className={`h-11 w-11 items-center justify-center rounded-xl ${background}`}
    >
      <Feather name={icon} size={18} color={color} />
    </View>
  );
};

export default function NotificationsRoute() {
  const router = useRouter();
  const { token } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead, refreshCount } =
    useNotifications();

  useEffect(() => {
    void refreshCount();
  }, []);

  const openNotification = useCallback(
    (notification: AppNotification) => {
      markRead(notification.id);
      if (token && notification.id.startsWith("server_")) {
        const notificationId = Number(notification.id.slice("server_".length));
        if (Number.isInteger(notificationId)) {
          void api
            .markServerNotificationRead(notificationId, token)
            .catch(() => undefined);
        }
      }
      router.push(notification.route as never);
    },
    [markRead, router, token],
  );

  const renderNotification = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      className={`flex-row items-start gap-3 border-b border-slate-100 px-4 py-4 ${item.read ? "bg-white" : "bg-teal-50/50"}`}
      onPress={() => openNotification(item)}
      activeOpacity={0.7}
    >
      <NotificationIcon type={item.type} />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-start gap-2">
          <Text className="flex-1 font-inter-semibold text-[15px] leading-5 text-slate-900">
            {item.title}
          </Text>
          {!item.read ? (
            <View className="mt-1.5 h-2 w-2 rounded-full bg-teal-700" />
          ) : null}
        </View>
        <Text className="mt-1 font-inter text-[13px] leading-5 text-slate-600">
          {item.body}
        </Text>
        <View className="mt-2 flex-row items-center gap-1.5">
          <Feather name="clock" size={12} color="#64748B" />
          <Text className="font-inter text-[11px] text-slate-500">
            {formatNotificationTime(item.timestamp)}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <View className="pt-safe flex-1 bg-[#F4F8FC]">
      <StatusBar style="light" backgroundColor="#075F5B" />
      <View className="flex-row items-center bg-[#075F5B] px-4 pb-4 pt-2">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15"
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-[19px] text-white">
            Notifications
          </Text>
          <Text className="mt-0.5 font-inter text-[11px] text-teal-100">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "All caught up"}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity
            className="rounded-lg bg-white/15 px-3 py-2"
            onPress={markAllRead}
            activeOpacity={0.75}
          >
            <Text className="font-inter-semibold text-xs text-white">
              Mark all read
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(notification) => notification.id}
        renderItem={renderNotification}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => void refreshCount()}
            tintColor="#0F766E"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center px-10 py-24">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-teal-100">
              <Feather name="bell-off" size={28} color="#0F766E" />
            </View>
            <Text className="mt-4 font-inter-bold text-lg text-slate-900">
              No notifications yet
            </Text>
            <Text className="mt-1 text-center font-inter text-sm leading-5 text-slate-500">
              New updates and assignments will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}
