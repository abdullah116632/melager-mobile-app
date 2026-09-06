import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, TouchableOpacity, View } from "react-native";

import appConfig from "@/app.json";

const APP_VERSION = appConfig.expo.version;

const FEATURES: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
}[] = [
  { icon: "coffee", label: "Daily meal tracking" },
  { icon: "credit-card", label: "Deposits & expense sharing" },
  { icon: "shopping-bag", label: "Bazar (grocery) list management" },
  { icon: "clipboard", label: "Notices & announcements" },
  { icon: "users", label: "Member & mess management" },
];

export default function AboutRoute() {
  const router = useRouter();

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
            About App
          </Text>
          <Text className="mt-0.5 font-inter text-[11px] text-teal-100">
            App info & version
          </Text>
        </View>
      </View>

      <View className="flex-1 px-4 pt-6">
        <View className="items-center rounded-[20px] border border-slate-200 bg-white px-6 py-8">
          <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-teal-700">
            <Feather name="grid" size={28} color="#FFFFFF" />
          </View>
          <Text className="mt-4 font-inter-bold text-[20px] text-slate-950">
            {appConfig.expo.name}
          </Text>
          <Text className="mt-1 font-inter text-[12px] text-slate-500">
            Version {APP_VERSION}
          </Text>
          <Text className="mt-4 text-center font-inter text-[13px] leading-5 text-slate-600">
            Mealager helps mess members track meals, deposits, and shared
            expenses together in one place — simple, transparent, and
            hassle-free.
          </Text>
        </View>

        <View className="mt-5 overflow-hidden rounded-[16px] border border-slate-200 bg-white">
          {FEATURES.map((feature, index) => (
            <View
              key={feature.label}
              className={`flex-row items-center gap-3 px-3.5 py-3.5 ${
                index === FEATURES.length - 1 ? "" : "border-b border-slate-200"
              }`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-teal-50">
                <Feather name={feature.icon} size={16} color="#0F766E" />
              </View>
              <Text className="font-inter-medium text-[13px] text-slate-800">
                {feature.label}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          className="mt-5 flex-row items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white py-3.5"
          onPress={() => router.push("/help-faq" as never)}
          activeOpacity={0.75}
        >
          <Feather name="help-circle" size={16} color="#0F766E" />
          <Text className="font-inter-semibold text-[13px] text-teal-700">
            Visit Help & FAQ
          </Text>
        </TouchableOpacity>

        <View className="mt-6 flex-row items-center justify-center gap-2">
          <Feather name="shield" size={13} color="#94A3B8" />
          <Text className="font-inter text-[11px] text-slate-400">
            © {new Date().getFullYear()} Mealager. All rights reserved.
          </Text>
        </View>
      </View>
    </View>
  );
}
