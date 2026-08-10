import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Platform, View, useColorScheme } from "react-native";
import { cssInterop } from "nativewind";

import { useColors } from "@/hooks/useColors";

const NativeWindBlurView = cssInterop(BlurView, { className: "style" });

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="dashboard">
        <Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
        />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meals">
        <Icon sf={{ default: "fork.knife", selected: "fork.knife" }} />
        <Label>Meals</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="expenses">
        <Icon
          sf={{
            default: "dollarsign.circle",
            selected: "dollarsign.circle.fill",
          }}
        />
        <Label>Expenses</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="deposits">
        <Icon sf={{ default: "banknote", selected: "banknote.fill" }} />
        <Label>Deposits</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        lazy: true,
        freezeOnBlur: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <NativeWindBlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              className="absolute inset-0"
            />
          ) : isWeb ? (
            <View className="absolute inset-0 bg-slate-50" />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Feather name="layout" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          tabBarIcon: ({ color }) => (
            <Feather name="coffee" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: ({ color }) => (
            <Feather name="dollar-sign" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="deposits"
        options={{
          title: "Deposits",
          tabBarIcon: ({ color }) => (
            <Feather name="credit-card" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
