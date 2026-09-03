import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { useAuth } from "@/redux/hooks";

type ManagerActionProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  onPress: () => void;
};

function ManagerAction({
  icon,
  title,
  description,
  onPress,
}: ManagerActionProps) {
  return (
    <Pressable
      className="mb-3 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50"
      onPress={onPress}
    >
      <View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
        <Ionicons name={icon} size={22} color="#0f766e" />
      </View>
      <View className="flex-1">
        <Text className="font-inter-semibold text-base text-slate-900">
          {title}
        </Text>
        <Text className="mt-0.5 font-inter text-sm text-slate-500">
          {description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </Pressable>
  );
}

export function ManagerScreen() {
  const router = useRouter();
  const { role } = useAuth();

  useEffect(() => {
    if (role !== "admin") {
      router.replace("/(tabs)/dashboard");
    }
  }, [role, router]);

  if (role !== "admin") return null;

  return (
    <View
      className={`flex-1 bg-slate-50 px-5 ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
    >
      <View className="pb-6 pt-5">
        <View className="mb-2 flex-row items-center gap-2">
          <Ionicons name="shield-checkmark" size={25} color="#0f766e" />
          <Text className="font-inter-bold text-2xl text-slate-900">
            Manager
          </Text>
        </View>
        <Text className="font-inter text-sm text-slate-500">
          Manage your mess and member activity.
        </Text>
      </View>

      <ManagerAction
        icon="people-outline"
        title="Member Requests"
        description="Review and approve new member requests"
        onPress={() => router.push("/member-requests")}
      />
      <ManagerAction
        icon="restaurant-outline"
        title="Meal Status"
        description="View and manage daily meal activity"
        onPress={() => router.push("/meal-status")}
      />
      <ManagerAction
        icon="shield-outline"
        title="Security"
        description="Manage manager verification settings"
        onPress={() => router.push("/settings/security")}
      />
    </View>
  );
}
