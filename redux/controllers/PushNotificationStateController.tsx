import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { useEffect, type ReactNode } from "react";

import { api, clearApiCache } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { selectAuthToken } from "@/redux/slice/authSlice";
import { refreshNotifications } from "@/redux/slice/notificationSlice";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const getPushToken = async (): Promise<string | null> => {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === "granted"
      ? current
      : await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "General notifications",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
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
  const token = useAppSelector(selectAuthToken);

  useEffect(() => {
    if (!token) return;
    void getPushToken()
      .then((pushToken) =>
        pushToken ? api.registerPushToken(pushToken, Platform.OS, token) : undefined,
      )
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {
      clearApiCache();
      void dispatch(refreshNotifications());
    });
    const response = Notifications.addNotificationResponseReceivedListener(
      ({ notification }) => {
        const route = notification.request.content.data?.route;
        if (typeof route === "string" && route.startsWith("/")) {
          router.push(route as never);
        }
      },
    );
    return () => {
      received.remove();
      response.remove();
    };
  }, [dispatch, router]);

  return <>{children}</>;
};
