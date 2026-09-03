import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import React from "react";
import { Platform, Text, View, useColorScheme } from "react-native";
import { cssInterop } from "nativewind";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/redux/hooks";

const NativeWindBlurView = cssInterop(BlurView, { className: "style" });

type ClassicTabIconProps = {
  name: React.ComponentProps<typeof Ionicons>["name"];
  activeName: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  focused: boolean;
};

function ClassicTabIcon({
  name,
  activeName,
  color,
  focused,
}: ClassicTabIconProps) {
  return (
    <View
      style={{
        width: 50,
        height: 26,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={focused ? activeName : name}
        size={focused ? 23 : 22}
        color={color}
      />
    </View>
  );
}

function NativeTabLayout() {
  const { role } = useAuth();

  return (
    <NativeTabs>
      {role === "admin" ? (
        <NativeTabs.Trigger name="manager">
          <Icon sf={{ default: "shield", selected: "shield.fill" }} />
          <Label>Manager</Label>
        </NativeTabs.Trigger>
      ) : null}
      <NativeTabs.Trigger name="dashboard">
        <Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
        />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meals">
        <Icon
          sf={{ default: "fork.knife", selected: "fork.knife.circle.fill" }}
        />
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
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      initialRouteName="dashboard"
      detachInactiveScreens={false}
      screenOptions={{
        lazy: true,
        freezeOnBlur: false,
        animation: "none",
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarActiveBackgroundColor: "transparent",
        tabBarInactiveBackgroundColor: "transparent",
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            numberOfLines={1}
            style={{
              color,
              fontFamily: focused ? "Inter_600SemiBold" : "Inter_400Regular",
              fontSize: 11,
              lineHeight: 14,
            }}
          >
            {children}
          </Text>
        ),
        tabBarItemStyle: {
          marginHorizontal: 3,
          marginTop: 1,
          transform: [{ translateY: -4 }],
        },
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
        name="manager"
        options={{
          title: "Manager",
          // Keep the navigator's route/button structure static while auth is
          // restored. Changing tabBarButton at runtime can remount the nested
          // tab navigator and lose its parent navigation context on Android.
          tabBarItemStyle: isAdmin
            ? undefined
            : { display: "none", width: 0, marginHorizontal: 0 },
          tabBarIcon: ({ color, focused }) => (
            <ClassicTabIcon
              name="shield-outline"
              activeName="shield"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <ClassicTabIcon
              name="grid-outline"
              activeName="grid"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: "Meals",
          lazy: false,
          freezeOnBlur: false,
          tabBarIcon: ({ color, focused }) => (
            <ClassicTabIcon
              name="restaurant-outline"
              activeName="restaurant"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          lazy: false,
          freezeOnBlur: false,
          tabBarIcon: ({ color, focused }) => (
            <ClassicTabIcon
              name="cash-outline"
              activeName="cash"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="deposits"
        options={{
          title: "Deposits",
          lazy: false,
          freezeOnBlur: false,
          tabBarIcon: ({ color, focused }) => (
            <ClassicTabIcon
              name="card-outline"
              activeName="card"
              color={color}
              focused={focused}
            />
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
