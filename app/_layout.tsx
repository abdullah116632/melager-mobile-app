import "../global.css";

import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { useFonts } from "expo-font";
import { Slot, useSegments, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableFreeze } from "react-native-screens";
import { cssInterop } from "nativewind";
import { Provider } from "react-redux";

import { AppDrawer } from "@/components/AppDrawer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationPanel } from "@/components/NotificationPanel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineActionBanner } from "@/components/OfflineActionBanner";
import { RefreshSuccessToast } from "@/components/RefreshSuccessToast";
import { OfflineDatabaseProvider, OfflineSyncController } from "@/offline";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { MessStateController } from "@/redux/controllers/MessStateController";
import { NetworkStateController } from "@/redux/controllers/NetworkStateController";
import { NotificationStateController } from "@/redux/controllers/NotificationStateController";
import { RealtimeStateController } from "@/redux/controllers/RealtimeStateController";
import { PushNotificationStateController } from "@/redux/controllers/PushNotificationStateController";
import {
  initializeAuth,
  selectActiveMess,
  selectAuthLoading,
  selectAuthUser,
} from "@/redux/slice/authSlice";
import { store } from "@/redux/store";
import {
  clearPendingAdminOtp,
  getPendingAdminOtp,
} from "@/services/pendingAdminOtpService";

SplashScreen.preventAutoHideAsync();

// React Navigation's `freezeOnBlur` only takes effect after this native-screen
// setting is enabled. It keeps an inactive tab's Redux data in memory while
// stopping its React tree from doing layout and render work.
enableFreeze(true);

const NativeWindGestureHandlerRootView = cssInterop(GestureHandlerRootView, {
  className: "style",
});

function AuthGate() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const activeMess = useAppSelector(selectActiveMess);
  const authLoading = useAppSelector(selectAuthLoading);
  const segments = useSegments();
  const router = useRouter();
  const first = segments[0] as string | undefined;
  const second = segments[1] as string | undefined;
  const inAuth = first === "auth";
  const inMessHub = !first || first === "index";
  const inMessSetup = first === "mess-setup";
  const inAccount = first === "account";
  const inAccountSecurity = first === "settings" && second === "security";
  const inAdminOtp = first === "settings" && second === "admin-otp";
  const inManagerTab =
    (first === "(tabs)" && second === "manager") || first === "manager";
  const pendingRedirectRef = useRef<string | null>(null);

  useEffect(() => {
    void dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;

    const replaceOnce = (path: "/" | "/auth" | "/(tabs)/dashboard") => {
      if (pendingRedirectRef.current === path) return;
      pendingRedirectRef.current = path;
      router.replace(path);
    };

    const applyRouteGuard = async () => {
      if (authLoading) return;

      if (!user) {
        if (!inAuth) replaceOnce("/auth");
        else pendingRedirectRef.current = null;
      } else if (!activeMess) {
        if (!inMessHub && !inMessSetup && !inAccount && !inAccountSecurity) {
          replaceOnce("/");
        } else {
          pendingRedirectRef.current = null;
        }
      } else {
        if (inManagerTab && activeMess.role !== "admin") {
          replaceOnce("/(tabs)/dashboard");
          return;
        }
        const pendingAdminOtp = await getPendingAdminOtp();
        if (cancelled) return;
        if (pendingAdminOtp?.userId === user.id) {
          if (!inAdminOtp) router.replace("/settings/admin-otp");
          return;
        }
        if (pendingAdminOtp) await clearPendingAdminOtp();
        if (inAuth || inMessHub || inMessSetup) {
          replaceOnce("/(tabs)/dashboard");
        } else {
          pendingRedirectRef.current = null;
        }
      }
    };

    void applyRouteGuard();
    return () => {
      cancelled = true;
    };
  }, [user, activeMess, authLoading, segments]);

  // Cover protected content while authentication is still being restored or
  // while a signed-out user is waiting for the auth redirect.
  if (authLoading || (!user && !inAuth)) {
    return (
      <View className="absolute inset-0 z-[999] items-center justify-center bg-teal-700">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <Slot />
      <AuthGate />
      <AppDrawer />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <OfflineDatabaseProvider>
          <NetworkStateController>
            <OfflineSyncController>
              <ErrorBoundary>
                <MessStateController>
                  <PushNotificationStateController>
                    <RealtimeStateController>
                      <NotificationStateController>
                        <NativeWindGestureHandlerRootView className="flex-1">
                          <KeyboardProvider>
                            <RootLayoutNav />
                          </KeyboardProvider>
                          <RefreshSuccessToast />
                          <NotificationPanel />
                          <OfflineBanner />
                          <OfflineActionBanner />
                        </NativeWindGestureHandlerRootView>
                      </NotificationStateController>
                    </RealtimeStateController>
                  </PushNotificationStateController>
                </MessStateController>
              </ErrorBoundary>
            </OfflineSyncController>
          </NetworkStateController>
        </OfflineDatabaseProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
