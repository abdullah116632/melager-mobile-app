import Feather from "@expo/vector-icons/Feather";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Clipboard,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useDrawer } from "@/context/DrawerContext";

const ANIMATION_DURATION = 240;
const USE_NATIVE_DRIVER = Platform.OS !== "web";

const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getAvatarColor = (name: string): string => {
  const palette = [
    "#DB2777",
    "#0284C7",
    "#7C3AED",
    "#EA580C",
    "#059669",
  ];
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
};

export function AppDrawer() {
  const { user, mess, role, logout, exitMess } = useAuth();
  const { isOpen, closeDrawer } = useDrawer();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const drawerWidth = Math.min(Math.max(screenWidth * 0.84, 292), 360);

  const slideAnimation = useRef(new Animated.Value(-360)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: -drawerWidth,
        duration: ANIMATION_DURATION,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => setVisible(false));
  }, [drawerWidth, fadeAnimation, isOpen, slideAnimation]);

  const handleCopyKey = () => {
    if (!mess?.messKey) return;
    Clipboard.setString(mess.messKey);
    setKeyCopied(true);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const navigateTo = (path: string) => {
    closeDrawer();
    setTimeout(() => router.navigate(path as never), 50);
  };

  const handleLogout = async () => {
    closeDrawer();
    setTimeout(async () => {
      setLoggingOut(true);
      try {
        await logout();
      } finally {
        setLoggingOut(false);
      }
    }, ANIMATION_DURATION + 50);
  };

  if (!visible) return null;

  const displayName = user?.name ?? "User";
  const displayEmail = user?.email ?? "";
  const isAdmin = role === "admin";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeDrawer}
    >
      <StatusBar style="light" backgroundColor="#064E4A" />
      <Animated.View
        className="absolute inset-0"
        style={{ opacity: fadeAnimation }}
      >
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View className="absolute inset-0 bg-slate-950/65" />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        className="absolute bottom-0 left-0 top-0 overflow-hidden bg-[#F8FAFC]"
        style={{
          width: drawerWidth,
          transform: [{ translateX: slideAnimation }],
          shadowColor: "#020617",
          shadowOpacity: 0.3,
          shadowRadius: 20,
          shadowOffset: { width: 8, height: 0 },
          elevation: 16,
        }}
      >
        <LinearGradient
          colors={["#075F5B", "#00796F", "#0B8E7D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="relative overflow-hidden px-5 pb-8"
          style={{ paddingTop: insets.top + 12 }}
        >
          <View className="absolute -bottom-16 -left-16 h-[170px] w-[130%] rotate-[-7deg] rounded-[100%] bg-white/[0.06]" />
          <View className="absolute -bottom-20 right-[-50px] h-[150px] w-[110%] rotate-[8deg] rounded-[100%] border border-white/[0.08]" />
          <View className="absolute left-5 top-9 flex-row flex-wrap opacity-25" style={{ width: 38 }}>
            {Array.from({ length: 16 }, (_, index) => (
              <View
                key={index}
                className="m-[3px] h-[3px] w-[3px] rounded-full bg-white"
              />
            ))}
          </View>

          <View className="mt-3 flex-row items-start gap-3">
            <View className="shrink-0 items-center">
              <View className="h-[64px] w-[64px] items-center justify-center rounded-full border-[5px] border-white/20">
                <View
                  className="h-[54px] w-[54px] items-center justify-center rounded-full border-2 border-teal-950/30"
                  style={{ backgroundColor: getAvatarColor(displayName) }}
                >
                  <Text className="font-inter-bold text-[22px] text-white">
                    {getInitials(displayName)}
                  </Text>
                </View>
              </View>
              <View className="mt-1.5 flex-row items-center gap-1 rounded-lg border border-white/10 bg-white/15 px-2 py-1">
                <Feather
                  name={isAdmin ? "shield" : "user"}
                  size={11}
                  color="#FFFFFF"
                />
                <Text className="font-inter-bold text-[10px] text-white">
                  {isAdmin ? "Admin" : "Member"}
                </Text>
              </View>
            </View>
            <View className="flex-1">
              <Text
                className="font-inter-bold text-[18px] tracking-[-0.2px] text-white"
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                className="mt-0.5 font-inter text-[11px] text-white/70"
                numberOfLines={1}
              >
                {displayEmail}
              </Text>
            </View>
            <TouchableOpacity
              className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white"
              onPress={closeDrawer}
              activeOpacity={0.8}
              accessibilityLabel="Close drawer"
            >
              <Feather name="x" size={20} color="#0F766E" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-3"
        >
          {mess && (
            <>
              <SectionLabel label="MESS" />
              <View className="mx-4 overflow-hidden rounded-[16px] border border-slate-200 bg-white">
                <DrawerRow icon="home" label={mess.name} sublabel="Mess name" />
                <View className="flex-row items-center gap-3 px-3.5 py-3.5">
                  <IconBadge icon="key" />
                  <View className="flex-1">
                    <Text className="font-inter text-[11px] text-slate-500">
                      Mess Key
                    </Text>
                    <Text
                      className="mt-0.5 font-inter-bold text-[13px] tracking-[2.2px] text-slate-950"
                      numberOfLines={1}
                    >
                      {mess.messKey}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className={`h-9 w-9 items-center justify-center rounded-[10px] ${keyCopied ? "bg-emerald-600" : "bg-teal-50"}`}
                    onPress={handleCopyKey}
                    activeOpacity={0.7}
                    accessibilityLabel="Copy mess key"
                  >
                    <Feather
                      name={keyCopied ? "check" : "copy"}
                      size={16}
                      color={keyCopied ? "#FFFFFF" : "#0F766E"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <SectionLabel label="MENU" />
          <View className="mx-4 overflow-hidden rounded-[16px] border border-slate-200 bg-white">
            {isAdmin && (
              <DrawerRow
                icon="users"
                label="Member Requests"
                sublabel="Review join requests"
                onPress={() => navigateTo("/member-requests")}
                showChevron
              />
            )}
            {isAdmin && (
              <DrawerRow
                icon="list"
                label="Consumers"
                sublabel="View all members & contacts"
                onPress={() => navigateTo("/consumers")}
                showChevron
              />
            )}
            <DrawerRow
              icon="user"
              label="Profile"
              sublabel="View your account"
              onPress={() => navigateTo("/(tabs)/profile")}
              showChevron
            />
            <DrawerRow
              icon="grid"
              label="Switch Mess"
              sublabel="Go back to mess hub"
              onPress={() => {
                exitMess();
                closeDrawer();
              }}
              showChevron
            />
            <DrawerRow
              icon="shield"
              label="Security"
              sublabel="Password, email & admin"
              onPress={() => navigateTo("/settings/security")}
              showChevron
              isLast
            />
          </View>
        </ScrollView>

        <View
          className="border-t border-slate-200 bg-white px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="overflow-hidden rounded-[14px]">
            <LinearGradient
              colors={["#DC2626", "#EF2B2D", "#E11D48"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <TouchableOpacity
                className={`flex-row items-center justify-center gap-3 py-3.5 ${loggingOut ? "opacity-60" : "opacity-100"}`}
                onPress={handleLogout}
                disabled={loggingOut}
                activeOpacity={0.82}
              >
                <Feather name="log-out" size={19} color="#FFFFFF" />
                <Text className="font-inter-bold text-[16px] text-white">
                  {loggingOut ? "Logging out…" : "Log Out"}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
          <View className="mt-3 flex-row items-center justify-center gap-2">
            <Feather name="shield" size={13} color="#0F766E" />
            <Text className="font-inter text-[10px] text-slate-500">
              Meal Manager v1.0.0
            </Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const SectionLabel = ({ label }: { label: string }) => (
  <Text className="px-5 pb-2 pt-[18px] font-inter-bold text-[11px] tracking-[1.1px] text-teal-700">
    {label}
  </Text>
);

const IconBadge = ({ icon }: { icon: React.ComponentProps<typeof Feather>["name"] }) => (
  <View className="h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-teal-50">
    <Feather name={icon} size={19} color="#0F766E" />
  </View>
);

interface DrawerRowProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sublabel?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}

const DrawerRow = ({
  icon,
  label,
  sublabel,
  onPress,
  showChevron,
  isLast = false,
}: DrawerRowProps) => {
  const content = (
    <>
      <IconBadge icon={icon} />
      <View className="flex-1">
        <Text className="font-inter-semibold text-[14px] text-slate-950">
          {label}
        </Text>
        {sublabel ? (
          <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
            {sublabel}
          </Text>
        ) : null}
      </View>
      {showChevron ? (
        <Feather name="chevron-right" size={19} color="#0F766E" />
      ) : null}
    </>
  );
  const rowClassName = `flex-row items-center gap-3 px-3.5 py-3.5 ${isLast ? "" : "border-b border-slate-200"}`;

  if (!onPress) return <View className={rowClassName}>{content}</View>;

  return (
    <TouchableOpacity
      className={rowClassName}
      onPress={onPress}
      activeOpacity={0.68}
    >
      {content}
    </TouchableOpacity>
  );
};
