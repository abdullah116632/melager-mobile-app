import "../global.css";

import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { useFonts } from "expo-font";
import { Stack, useSegments, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { cssInterop } from "nativewind";
import { Provider } from "react-redux";

import { AppDrawer } from "@/components/AppDrawer";
import { ConnectivityGate } from "@/components/ConnectivityGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationPanel } from "@/components/NotificationPanel";
import { RefreshSuccessToast } from "@/components/RefreshSuccessToast";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { MessStateController } from "@/redux/controllers/MessStateController";
import { NetworkStateController } from "@/redux/controllers/NetworkStateController";
import { NotificationStateController } from "@/redux/controllers/NotificationStateController";
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
  const redirectingToMessHub = Boolean(
    user &&
    !activeMess &&
    !inMessHub &&
    !inMessSetup &&
    !inAccount &&
    !inAccountSecurity,
  );

  useEffect(() => {
    void dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;

    const applyRouteGuard = async () => {
      if (authLoading) return;

      if (!user) {
        if (!inAuth) router.replace("/auth");
      } else if (!activeMess) {
        if (!inMessHub && !inMessSetup && !inAccount && !inAccountSecurity) {
          router.replace("/");
        }
      } else {
        if (inManagerTab && activeMess.role !== "admin") {
          router.replace("/(tabs)/dashboard");
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
          router.replace("/(tabs)/dashboard");
        }
      }
    };

    void applyRouteGuard();
    return () => {
      cancelled = true;
    };
  }, [user, activeMess, authLoading, segments]);

  // Do not render the previous protected route during the brief interval
  // before the auth redirect runs. This prevents a dashboard flash after
  // launching or reconnecting while signed out.
  if (authLoading || (!user && !inAuth) || redirectingToMessHub) {
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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="mess-setup" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="meal-status" options={{ headerShown: false }} />
        <Stack.Screen
          name="consumer-breakdown"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="notice-board" options={{ headerShown: false }} />
      </Stack>
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
        <NetworkStateController>
          <ErrorBoundary>
            <MessStateController>
              <NotificationStateController>
                <NativeWindGestureHandlerRootView className="flex-1">
                  <KeyboardProvider>
                    <RootLayoutNav />
                  </KeyboardProvider>
                  <RefreshSuccessToast />
                  <NotificationPanel />
                  <ConnectivityGate />
                </NativeWindGestureHandlerRootView>
              </NotificationStateController>
            </MessStateController>
          </ErrorBoundary>
        </NetworkStateController>
      </Provider>
    </SafeAreaProvider>
  );
}
