import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ComponentProps } from "react";
import {
  Image,
  Linking,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  APP_NAME,
  APP_VERSION,
  PLAY_STORE_URL,
  SHARE_MESSAGE,
} from "@/constants/app";

// Metro's require is how Expo loads bundled images; it is typed globally by
// expo/types, whereas an ES import of a .png has no type declaration here.
const appIcon = require("../assets/images/icon.png");

type FeatherIcon = ComponentProps<typeof Feather>["name"];

// Every statement on this page describes something the app really does.
// When a feature changes, update the matching line here as well.

const HOW_IT_WORKS: { title: string; text: string }[] = [
  {
    title: "Create or join a mess",
    text: "A manager creates the mess and shares its 8-character key. Members join with that key.",
  },
  {
    title: "Record meals and money",
    text: "Members turn their meals on or off. The manager records meal counts, deposits and expenses.",
  },
  {
    title: "See where everyone stands",
    text: "The app works out the meal rate and every person's balance for you.",
  },
];

const FEATURES: { icon: FeatherIcon; title: string; text: string }[] = [
  {
    icon: "coffee",
    title: "Meal On/Off",
    text: "Skip a meal for one day or until you turn it back on",
  },
  {
    icon: "calendar",
    title: "Menu & Timing",
    text: "Managers set the daily menu and meal on/off times",
  },
  {
    icon: "credit-card",
    title: "Deposits & Expenses",
    text: "Every taka paid and spent, recorded clearly",
  },
  {
    icon: "pie-chart",
    title: "Automatic Balance",
    text: "Meal rate, cost and balance worked out for you",
  },
  {
    icon: "file-text",
    title: "Statement & PDF",
    text: "Everyone's meals and balance for any dates",
  },
  {
    icon: "shopping-bag",
    title: "Bazar List",
    text: "A shared shopping list with bazar duty",
  },
  {
    icon: "message-circle",
    title: "Group Chat",
    text: "Talk with your whole mess and react to messages",
  },
  {
    icon: "bell",
    title: "Notices & Alerts",
    text: "Announcements and notifications for everyone",
  },
];

const ROLES: {
  icon: FeatherIcon;
  title: string;
  accent: "teal" | "amber";
  points: string[];
}[] = [
  {
    icon: "user",
    title: "For members",
    accent: "teal",
    points: [
      "See your meals, deposits and balance",
      "Turn your meals on or off",
      "Add items to the bazar list",
      "Read notices and chat with your mess",
    ],
  },
  {
    icon: "shield",
    title: "For managers",
    accent: "amber",
    points: [
      "Accept members and share manager roles",
      "Record meals, deposits and expenses",
      "Set the menu and meal on/off times",
      "Assign bazar duty and share statements",
    ],
  },
];

const PROMISES: { icon: FeatherIcon; title: string; text: string }[] = [
  {
    icon: "wifi-off",
    title: "Works offline",
    text: "Keep working without internet. Your changes sync when you are back online.",
  },
  {
    icon: "zap",
    title: "Updates live",
    text: "New messages and changes from others show up without refreshing.",
  },
  {
    icon: "lock",
    title: "Safe sign-in",
    text: "Sign in with email or Google. Your login is stored securely on your phone.",
  },
  {
    icon: "layers",
    title: "Many messes, one account",
    text: "Join more than one mess and switch between them at any time.",
  },
];

const SectionTitle = ({ title }: { title: string }) => (
  <Text className="mb-2.5 ml-1 font-inter-semibold text-[11px] tracking-[1px] text-slate-500">
    {title}
  </Text>
);

export default function AboutRoute() {
  const router = useRouter();

  const shareApp = async () => {
    try {
      await Share.share({ message: SHARE_MESSAGE });
    } catch {
      // Dismissing the share sheet is not an error worth surfacing.
    }
  };

  const actions: {
    icon: FeatherIcon;
    title: string;
    text: string;
    onPress: () => void;
  }[] = [
    {
      icon: "help-circle",
      title: "Help & FAQ",
      text: "Simple answers to common questions",
      onPress: () => router.push("/help-faq" as never),
    },
    {
      icon: "share-2",
      title: "Share App",
      text: `Tell your friends about ${APP_NAME}`,
      onPress: () => void shareApp(),
    },
    {
      icon: "star",
      title: "Rate us on Play Store",
      text: "Your review helps us make the app better",
      onPress: () => void Linking.openURL(PLAY_STORE_URL),
    },
  ];

  return (
    <View className="flex-1 bg-[#F4F8FC]">
      <StatusBar style="light" backgroundColor="#075F5B" />

      <View className="pt-safe-offset-2 flex-row items-center bg-[#075F5B] px-4 pb-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-[19px] text-white">
            About App
          </Text>
          <Text className="mt-0.5 font-inter text-[11px] text-teal-100">
            What {APP_NAME} is and how it helps
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pt-5 pb-safe-offset-[32px]"
      >
        {/* Identity */}
        <View className="items-center rounded-[22px] border border-slate-200 bg-white px-6 pb-7 pt-8">
          <Image
            source={appIcon}
            className="h-[84px] w-[84px] rounded-[22px]"
            accessibilityLabel={`${APP_NAME} app icon`}
          />
          <Text className="mt-4 font-inter-bold text-[24px] text-slate-950">
            {APP_NAME}
          </Text>
          <View className="mt-2 rounded-full bg-teal-50 px-3 py-1">
            <Text className="font-inter-semibold text-[11px] text-teal-700">
              Version {APP_VERSION}
            </Text>
          </View>
          <Text className="mt-4 text-center font-inter-semibold text-[15px] text-teal-800">
            Track meals, expenses & deposits
          </Text>
          <Text className="mt-2 text-center font-inter text-[13px] leading-[21px] text-slate-600">
            {APP_NAME} is a simple app for people who live and eat together in a
            mess. Meals, money and updates stay in one place, so nobody has to
            keep notes on paper or argue over the numbers.
          </Text>
        </View>

        {/* How it works */}
        <View className="mt-6">
          <SectionTitle title="HOW IT WORKS" />
          <View className="rounded-[18px] border border-slate-200 bg-white px-4 py-2">
            {HOW_IT_WORKS.map((step, index) => {
              const isLast = index === HOW_IT_WORKS.length - 1;
              return (
                <View key={step.title} className="flex-row gap-3">
                  <View className="items-center">
                    <View className="mt-3 h-8 w-8 items-center justify-center rounded-full bg-teal-700">
                      <Text className="font-inter-bold text-[13px] text-white">
                        {index + 1}
                      </Text>
                    </View>
                    {!isLast ? (
                      <View className="mt-1 w-[2px] flex-1 bg-teal-100" />
                    ) : null}
                  </View>
                  <View className={`flex-1 pt-3 ${isLast ? "pb-3" : "pb-4"}`}>
                    <Text className="font-inter-bold text-[14px] text-slate-900">
                      {step.title}
                    </Text>
                    <Text className="mt-1 font-inter text-[12px] leading-[19px] text-slate-500">
                      {step.text}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Features */}
        <View className="mt-6">
          <SectionTitle title="EVERYTHING IN ONE APP" />
          <View className="flex-row flex-wrap justify-between">
            {FEATURES.map((feature) => (
              <View
                key={feature.title}
                className="mb-3 w-[48.5%] rounded-[16px] border border-slate-200 bg-white p-3.5"
              >
                <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-teal-50">
                  <Feather name={feature.icon} size={17} color="#0F766E" />
                </View>
                <Text className="mt-2.5 font-inter-bold text-[13px] text-slate-900">
                  {feature.title}
                </Text>
                <Text className="mt-1 font-inter text-[11px] leading-[16px] text-slate-500">
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Roles */}
        <View className="mt-3">
          <SectionTitle title="MADE FOR EVERYONE IN THE MESS" />
          <View className="gap-3">
            {ROLES.map((role) => {
              const isAmber = role.accent === "amber";
              return (
                <View
                  key={role.title}
                  className="rounded-[18px] border border-slate-200 bg-white p-4"
                >
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-[11px] ${
                        isAmber ? "bg-amber-50" : "bg-teal-50"
                      }`}
                    >
                      <Feather
                        name={role.icon}
                        size={17}
                        color={isAmber ? "#B45309" : "#0F766E"}
                      />
                    </View>
                    <Text className="font-inter-bold text-[15px] text-slate-900">
                      {role.title}
                    </Text>
                  </View>
                  <View className="mt-3 gap-2">
                    {role.points.map((point) => (
                      <View key={point} className="flex-row items-start gap-2">
                        <Feather
                          name="check"
                          size={14}
                          color={isAmber ? "#B45309" : "#0F766E"}
                          style={{ marginTop: 2 }}
                        />
                        <Text className="flex-1 font-inter text-[13px] leading-[19px] text-slate-600">
                          {point}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reliability */}
        <View className="mt-6">
          <SectionTitle title="BUILT TO BE RELIABLE" />
          <View className="overflow-hidden rounded-[18px] bg-teal-700">
            {PROMISES.map((promise, index) => (
              <View
                key={promise.title}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${
                  index === PROMISES.length - 1
                    ? ""
                    : "border-b border-white/10"
                }`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-white/15">
                  <Feather name={promise.icon} size={16} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="font-inter-semibold text-[13px] text-white">
                    {promise.title}
                  </Text>
                  <Text className="mt-0.5 font-inter text-[11px] leading-[16px] text-teal-100">
                    {promise.text}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View className="mt-6">
          <SectionTitle title="MORE" />
          <View className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
            {actions.map((action, index) => (
              <TouchableOpacity
                key={action.title}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${
                  index === actions.length - 1
                    ? ""
                    : "border-b border-slate-100"
                }`}
                onPress={action.onPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={action.title}
              >
                <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-teal-50">
                  <Feather name={action.icon} size={16} color="#0F766E" />
                </View>
                <View className="flex-1">
                  <Text className="font-inter-semibold text-[14px] text-slate-900">
                    {action.title}
                  </Text>
                  <Text className="mt-0.5 font-inter text-[11px] text-slate-500">
                    {action.text}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View className="mt-7 items-center">
          <Text className="font-inter-semibold text-[12px] text-slate-500">
            Made for mess life in Bangladesh
          </Text>
          <Text className="mt-1 font-inter text-[11px] text-slate-400">
            {APP_NAME} v{APP_VERSION} · © {new Date().getFullYear()} {APP_NAME}.
            All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
