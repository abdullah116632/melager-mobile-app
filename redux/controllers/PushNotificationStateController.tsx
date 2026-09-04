import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { AppState, Platform } from "react-native";
import { useEffect, useMemo, useRef, type ReactNode } from "react";

import { api, clearApiCache } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectAuthState, selectMess } from "@/redux/slice/authSlice";
import {
  refreshNotifications,
  selectNotificationState,
} from "@/redux/slice/notificationSlice";
import { loadUnreadMessageCount } from "@/redux/slice/messagesSlice";

const PUSH_REGISTRATION_RETRY_MS = 30_000;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isMessage = notification.request.content.data?.type === "message";
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: !isMessage,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
}

const getPushToken = async (): Promise<string | null> => {
  if (Platform.OS === "web" || !Device.isDevice) return null;

  // Android 13+ only presents the notification permission prompt after an
  // app has created at least one channel.
  if (Platform.OS === "android") {
    await Promise.all([
      Notifications.setNotificationChannelAsync("default", {
        name: "General notifications",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      }),
      Notifications.setNotificationChannelAsync("messages", {
        name: "Messages",
        description: "New messages from your mess members",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        enableVibrate: true,
        vibrationPattern: [0, 250, 150, 250],
        showBadge: false,
      }),
    ]);
  }

  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === "granted"
      ? current
      : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
};

/** Registers this physical device and handles phone-level notification events. */
export const PushNotificationStateController = ({
  children,
}: {
  children: ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const auth = useAppSelector(selectAuthState);
  const notificationState = useAppSelector(selectNotificationState);
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponseId = useRef<string | null>(null);
  const unreadCount = useMemo(
    () =>
      notificationState.notifications.filter(
        (notification) => !notification.read && notification.type !== "message",
      ).length,
    [notificationState.notifications],
  );

  useEffect(() => {
    if (!auth.token) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let registrationInFlight = false;

    const scheduleRetry = () => {
      if (cancelled || retryTimer) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void registerDevice();
      }, PUSH_REGISTRATION_RETRY_MS);
    };

    const registerDevice = async () => {
      if (cancelled || registrationInFlight) return;
      registrationInFlight = true;
      try {
        const pushToken = await getPushToken();
        if (!pushToken) {
          console.warn(
            "Push notification registration skipped: permission was not granted or this is not a physical device.",
          );
          return;
        }
        await api.registerPushToken(pushToken, Platform.OS, auth.token!);
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
      } catch (error) {
        console.warn("Push notification registration failed", error);
        scheduleRetry();
      } finally {
        registrationInFlight = false;
      }
    };

    void registerDevice();
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") void registerDevice();
      },
    );

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [auth.token]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void Notifications.setBadgeCountAsync(unreadCount).catch(() => undefined);
  }, [unreadCount]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(
      (notification) => {
        const type = notification.request.content.data?.type;
        if (type === "message") {
          clearApiCache();
          void dispatch(loadUnreadMessageCount());
          return;
        }
        clearApiCache();
        void dispatch(refreshNotifications());
      },
    );
    return () => {
      received.remove();
    };
  }, [dispatch]);

  useEffect(() => {
    if (!lastResponse || auth.authLoading || !auth.token) return;

    const responseId = lastResponse.notification.request.identifier;
    if (handledResponseId.current === responseId) return;
    handledResponseId.current = responseId;

    const data = lastResponse.notification.request.content.data;
    const route = data?.route;
    const isMessage = data?.type === "message";
    const notificationMessId = Number(data?.messId);
    if (Number.isInteger(notificationMessId) && notificationMessId > 0) {
      const targetMess = auth.messes.find(
        (mess) => mess.id === notificationMessId,
      );
      if (targetMess && targetMess.id !== auth.activeMess?.id) {
        dispatch(selectMess(targetMess));
      } else if (!targetMess && route === "/messages") {
        Notifications.clearLastNotificationResponse();
        return;
      }
    }

    const notificationId = Number(data?.notificationId);
    if (Number.isInteger(notificationId) && notificationId > 0) {
      void api
        .markServerNotificationRead(notificationId, auth.token)
        .catch(() => undefined);
    }
    clearApiCache();
    if (!isMessage) void dispatch(refreshNotifications());
    Notifications.clearLastNotificationResponse();

    if (typeof route === "string" && route.startsWith("/")) {
      router.push(route as never);
    }
  }, [auth, dispatch, lastResponse, router]);

  return <>{children}</>;
};
