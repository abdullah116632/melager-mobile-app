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

import { AppDrawer } from "@/components/AppDrawer";
import { ConnectivityGate } from "@/components/ConnectivityGate";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationPanel } from "@/components/NotificationPanel";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DrawerProvider } from "@/context/DrawerContext";
import { MessProvider } from "@/context/MessContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { NotificationProvider } from "@/context/NotificationContext";
import {
  clearPendingAdminOtp,
  getPendingAdminOtp,
} from "@/services/pendingAdminOtpService";

SplashScreen.preventAutoHideAsync();

const NativeWindGestureHandlerRootView = cssInterop(GestureHandlerRootView, {
  className: "style",
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, activeMess, authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const first = segments[0] as string | undefined;
  const second = segments[1] as string | undefined;
  const inAuth = first === "auth";
  const inMessHub = !first || first === "index";
  const inMessSetup = first === "mess-setup";
  const inAdminOtp = first === "settings" && second === "admin-otp";

  useEffect(() => {
    let cancelled = false;

    const applyRouteGuard = async () => {
      if (authLoading) return;

      if (!user) {
        if (!inAuth) router.replace("/auth");
      } else if (!activeMess) {
        if (!inMessHub && !inMessSetup) router.replace("/");
      } else {
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
  if (authLoading || (!user && !inAuth)) {
    return (
      <View className="flex-1 items-center justify-center bg-teal-700">
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGate>
      <AppDrawer />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="mess-setup" options={{ headerShown: false }} />
        <Stack.Screen name="meal-status" options={{ headerShown: false }} />
      </Stack>
    </AuthGate>
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
      <NetworkProvider>
        <ConnectivityGate>
          <ErrorBoundary>
            <AuthProvider>
              <MessProvider>
                <NotificationProvider>
                  <DrawerProvider>
                    <NativeWindGestureHandlerRootView className="flex-1">
                      <KeyboardProvider>
                        <RootLayoutNav />
                      </KeyboardProvider>
                      <NotificationPanel />
                    </NativeWindGestureHandlerRootView>
                  </DrawerProvider>
                </NotificationProvider>
              </MessProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ConnectivityGate>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}
