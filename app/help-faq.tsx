import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    title: "Mess & Members",
    icon: "home",
    items: [
      {
        question: "How do I join a mess?",
        answer:
          "Ask the mess admin for the Mess Key, then use that key from the mess hub screen to join. An admin can approve your request from Member Requests.",
      },
      {
        question: "How do I find my Mess Key?",
        answer:
          "Open the drawer menu — your Mess Key is shown under the MESS section. Tap the copy icon to copy it and share it with new members.",
      },
      {
        question: "Can I be part of more than one mess?",
        answer:
          "You can switch between messes from the drawer using \"Switch Mess\", but only one mess can be active at a time.",
      },
      {
        question: "How do I leave a mess?",
        answer:
          "Go to your Profile from the drawer menu, where you'll find the option to leave your current mess.",
      },
    ],
  },
  {
    title: "Meals & Deposits",
    icon: "coffee",
    items: [
      {
        question: "How are meal counts calculated?",
        answer:
          "Each member's meals are logged per day from the Meals tab. The dashboard totals these to calculate everyone's meal rate and balance.",
      },
      {
        question: "How do deposits affect my balance?",
        answer:
          "Deposits you add are credited to your account. Your final balance is your total deposits minus your share of the total expenses.",
      },
      {
        question: "Who can add expenses or bazar entries?",
        answer:
          "Only mess admins can add or edit expenses and bazar (grocery) entries, which keeps the shared ledger consistent for everyone.",
      },
    ],
  },
  {
    title: "Notices & Notifications",
    icon: "bell",
    items: [
      {
        question: "Where do I see mess announcements?",
        answer:
          "Open Notice Board from the dashboard to see updates and announcements posted by your mess admin.",
      },
      {
        question: "I'm not receiving notifications, what should I check?",
        answer:
          "Make sure notifications are enabled for the app in your phone's system settings, and that you have an active internet connection.",
      },
    ],
  },
  {
    title: "Account & Security",
    icon: "shield",
    items: [
      {
        question: "How do I change my password or email?",
        answer:
          "Open the drawer menu and tap Security to update your password, email, and other admin-related security settings.",
      },
      {
        question: "The app isn't working offline, why?",
        answer:
          "Most screens work offline and sync automatically once you're back online. Look for the offline banner for details if something fails to sync.",
      },
    ],
  },
];

export default function HelpFaqRoute() {
  const router = useRouter();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggle = (key: string) =>
    setOpenKey((current) => (current === key ? null : key));

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
            Help & FAQ
          </Text>
          <Text className="mt-0.5 font-inter text-[11px] text-teal-100">
            Answers to common questions
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-10 pt-4"
      >
        {FAQ_SECTIONS.map((section) => (
          <View key={section.title} className="mb-5">
            <View className="mb-2 flex-row items-center gap-2 px-1">
              <Feather name={section.icon} size={15} color="#0F766E" />
              <Text className="font-inter-bold text-[13px] text-teal-800">
                {section.title}
              </Text>
            </View>
            <View className="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
              {section.items.map((item, index) => {
                const key = `${section.title}-${index}`;
                const isOpen = openKey === key;
                const isLast = index === section.items.length - 1;
                return (
                  <View
                    key={key}
                    className={isLast ? "" : "border-b border-slate-200"}
                  >
                    <TouchableOpacity
                      className="flex-row items-center gap-3 px-3.5 py-3.5"
                      onPress={() => toggle(key)}
                      activeOpacity={0.7}
                    >
                      <Text className="flex-1 font-inter-semibold text-[14px] text-slate-950">
                        {item.question}
                      </Text>
                      <Feather
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#0F766E"
                      />
                    </TouchableOpacity>
                    {isOpen ? (
                      <Text className="px-3.5 pb-3.5 font-inter text-[13px] leading-5 text-slate-600">
                        {item.answer}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View className="mt-1 items-center rounded-[16px] border border-slate-200 bg-white px-5 py-6">
          <View className="h-12 w-12 items-center justify-center rounded-[14px] bg-teal-50">
            <Feather name="mail" size={20} color="#0F766E" />
          </View>
          <Text className="mt-3 font-inter-bold text-[14px] text-slate-900">
            Still need help?
          </Text>
          <Text className="mt-1 text-center font-inter text-[12px] leading-5 text-slate-500">
            Ask your mess admin, or reach out to support if the issue is with
            the app itself.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
