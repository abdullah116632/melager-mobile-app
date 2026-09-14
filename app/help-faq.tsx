import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState, type ComponentProps } from "react";
import {
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import appConfig from "@/app.json";
import { PLAY_STORE_URL } from "@/constants/app";

type FeatherIcon = ComponentProps<typeof Feather>["name"];

interface FaqItem {
  question: string;
  answer: string;
  /** Numbered steps shown under the answer. */
  steps?: string[];
  /** A short highlighted example or warning. */
  tip?: string;
  /** Marks questions that only apply to managers. */
  managersOnly?: boolean;
}

interface FaqSection {
  id: string;
  title: string;
  icon: FeatherIcon;
  items: FaqItem[];
}

// Every answer below was checked against how the app actually behaves. When a
// feature changes, update the matching answer here as well.
const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "start",
    title: "Getting Started",
    icon: "compass",
    items: [
      {
        question: "How do I create an account?",
        answer:
          "Sign up with your name, email and a password. We send a 6-digit code to your email. Enter it to finish. The code works for 10 minutes.",
        tip: "You can also tap “Continue with Google” to sign up in one step.",
      },
      {
        question: "I forgot my password. What should I do?",
        answer: "You can set a new password with a code from your email.",
        steps: [
          "On the login screen, tap “Forgot password?”.",
          "Enter your email and tap to get a code.",
          "Enter the 6-digit code and choose a new password.",
        ],
        tip: "Signed up with Google? Use the same steps to create a password for your account.",
      },
      {
        question: "How do I create a mess?",
        answer:
          "Tap “Create a New Mess” and give it a name. You become the manager of that mess and get an 8-character mess key. Share this key with the people who should join.",
      },
      {
        question: "How do I join a mess?",
        answer:
          "Ask your manager for the mess key. Then tap “Join a Mess” and enter the key. Your request goes to the manager. You can enter the mess as soon as they accept it.",
      },
      {
        question: "My join request was rejected. Can I try again?",
        answer:
          "Yes. On the mess list screen, find the rejected request and tap “Request Again”. It goes back to the manager for approval.",
      },
      {
        question: "Can I be in more than one mess?",
        answer:
          "Yes. You can join or create as many messes as you like. To move between them, tap “Switch” on the Dashboard or “Switch Mess” in the side menu.",
      },
      {
        question: "How do I leave a mess?",
        answer:
          "There is no leave button. Ask a manager to remove you from All Members.",
        tip: "Removing a member also deletes their meal and deposit records in that mess. Settle your balance before you ask to be removed.",
      },
    ],
  },
  {
    id: "meals",
    title: "Meals",
    icon: "coffee",
    items: [
      {
        question: "How do I turn a meal off?",
        answer:
          "On the Dashboard, tap the switch next to Breakfast, Lunch or Dinner. Then choose how long to keep it off:",
        steps: [
          "“Only for today” — the meal turns back on by itself tomorrow.",
          "“Until I turn it on” — the meal stays off every day until you switch it back on.",
        ],
      },
      {
        question: "Can I turn off a meal for a future day?",
        answer:
          "Yes. Tap the date at the top of the meal list on the Dashboard, pick a future day, then use the switches as usual.",
      },
      {
        question: "Why can't I change my meal?",
        answer: "This usually happens for one of these reasons:",
        steps: [
          "The date is in the past. Past days cannot be changed.",
          "It is today and the on/off time set by your manager has ended.",
          "Your manager has turned that meal off for everyone.",
        ],
      },
      {
        question: "Does turning a meal off change my meal count?",
        answer:
          "No. Turning a meal off tells your manager you will not eat it. Your manager records the actual meal counts in the Meals tab, and your cost is based on those counts.",
      },
      {
        question: "Why does my Meals tab say “View only”?",
        answer:
          "Only managers can enter meal counts. Members can see everyone's meals but cannot edit them. If a count looks wrong, tell your manager.",
      },
      {
        question: "How do I record everyone's meals?",
        answer:
          "Open the Meals tab and tap a member's cell for a day. Type the meal count and use the arrows to move to the next cell.",
        tip: "Counts can have decimals, like 0.5 for a half meal.",
        managersOnly: true,
      },
      {
        question: "How do I set the menu and meal on/off times?",
        answer:
          "Go to the Manager tab and open Meal Status. For each meal you can:",
        steps: [
          "Turn the meal on or off for everyone.",
          "Set the time window when members can change that meal.",
          "Write the menu. Members get a notification about the new menu.",
        ],
        managersOnly: true,
      },
      {
        question: "How can I see who is not eating today?",
        answer:
          "Open Meal Status from the Manager tab. The Meal On/Off table lists everyone who turned a meal off for the selected date. You also get a notification when a member changes a meal.",
        managersOnly: true,
      },
    ],
  },
  {
    id: "money",
    title: "Deposits & Balance",
    icon: "credit-card",
    items: [
      {
        question: "How is the meal rate calculated?",
        answer:
          "The meal rate is the total expenses of the month divided by the total meals of the month.",
        tip: "Example: expenses ৳30,000 ÷ 600 meals = ৳50 per meal.",
      },
      {
        question: "How is my balance calculated?",
        answer:
          "Your cost is your meals multiplied by the meal rate. Your balance is your deposits minus your cost.",
        tip: "Example: 40 meals × ৳50 = ৳2,000 cost. If you deposited ৳2,500, your balance is ৳500.",
      },
      {
        question: "What does a negative balance mean?",
        answer:
          "It means you have used more than you deposited. That amount is due. Pay your manager to bring your balance back to zero or above.",
      },
      {
        question: "Where can I see my own numbers?",
        answer:
          "“My Monthly Summary” on the Dashboard shows your meals, deposits, cost and remaining balance. The Deposits tab shows every deposit made in the mess.",
      },
      {
        question: "What is the Statement?",
        answer:
          "The Statement shows every member's meals, deposits and balance for any date range you pick. Open it from the “Statement” shortcut on the Dashboard. Tap “PDF” to download a copy.",
      },
      {
        question: "Can I add my own deposit?",
        answer:
          "No. Only managers can add deposits and expenses, so the accounts stay correct for everyone. Give your money to the manager and they will add it.",
      },
      {
        question: "How do I add a deposit?",
        answer:
          "In the Deposits tab, tap the “+” button on the member's row. Enter the amount, the date and an optional note, then save.",
        tip: "Made a mistake? Enter a negative amount, like -500, to reduce a deposit.",
        managersOnly: true,
      },
      {
        question: "How do I add expenses?",
        answer:
          "In the Expenses tab, tap a day and add items. Each item needs a name and an amount. You can add many items to the same day.",
        managersOnly: true,
      },
    ],
  },
  {
    id: "bazar",
    title: "Bazar List",
    icon: "shopping-bag",
    items: [
      {
        question: "What is the Bazar List?",
        answer:
          "It is a shared shopping list for each day. Any member can add an item with its price, edit it, tick it when it is bought, or delete it. Open it from the “Bazar List” shortcut on the Dashboard.",
      },
      {
        question: "Why does it say the item is already on the list?",
        answer:
          "Each day can have only one item with the same name. Edit the item that is already there instead of adding it again.",
      },
      {
        question: "How do I assign bazar duty?",
        answer:
          "In the Bazar List, tap “Assign” to choose which members do the shopping on that weekday. Then tap “Notify assigned members” to send them a notification.",
        tip: "To notify, the day must have at least one item and one assigned member. Past days cannot be notified.",
        managersOnly: true,
      },
      {
        question: "How do I add bazar items to expenses?",
        answer:
          "In the Bazar List, pick the day and use the button that adds that day's bazar items to that day's expenses. Items that were already added are skipped, so nothing is counted twice.",
        managersOnly: true,
      },
    ],
  },
  {
    id: "updates",
    title: "Notices, Chat & Alerts",
    icon: "bell",
    items: [
      {
        question: "Where can I see mess announcements?",
        answer:
          "Tap “Notice Board” on the Dashboard. Managers post notices there and everyone can read and search them.",
      },
      {
        question: "How do I chat with my mess?",
        answer:
          "Tap “Messages” on the Dashboard. It is a group chat for everyone in your mess. Long-press a message to react to it.",
      },
      {
        question: "What will I be notified about?",
        answer: "You get notifications for things like:",
        steps: [
          "New messages and new notices.",
          "Menu updates and bazar duty.",
          "Your join request being accepted.",
          "Managers also get new join requests and meal on/off changes.",
        ],
      },
      {
        question: "I am not getting notifications. What should I check?",
        answer: "Please check these things:",
        steps: [
          "Notifications for Mealager are allowed in your phone settings.",
          "Battery saver is not blocking the app.",
          "Your phone is connected to the internet.",
        ],
      },
    ],
  },
  {
    id: "managers",
    title: "Managing a Mess",
    icon: "shield",
    items: [
      {
        question: "How do I accept new members?",
        answer:
          "Go to the Manager tab and open Member Requests. Accept or reject each request. The member gets a notification when you accept.",
        managersOnly: true,
      },
      {
        question: "How do I add a member directly?",
        answer:
          "In the Meals tab or the Deposits tab, tap the add-member button at the top and enter the person's email and name.",
        steps: [
          "If they are new to Mealager, an account is created and their login details are emailed to them.",
          "If they already have an account, they are added right away and we email them the mess key.",
        ],
        tip: "Adding a member needs an internet connection.",
        managersOnly: true,
      },
      {
        question: "How do I invite people to my mess?",
        answer:
          "Share your mess key with them. Open the side menu, tap the copy icon next to Mess Key, and send it by any app. They tap “Join a Mess”, enter the key, and you accept the request.",
        managersOnly: true,
      },
      {
        question: "How do I add another manager or hand over my role?",
        answer:
          "Go to the Manager tab and open Mess Settings. From there you can:",
        steps: [
          "Add New Manager — give a member manager access and keep yours.",
          "Transfer Manager Role — make someone else the manager.",
          "Remove My Manager Role — stay in the mess as a regular member.",
        ],
        tip: "You confirm each action with your password or with Google. A mess must always have at least one manager.",
        managersOnly: true,
      },
      {
        question: "How do I remove a member?",
        answer:
          "Open All Members and remove the member. A manager cannot be removed until their manager role is taken away first.",
        tip: "This permanently deletes that member's meal and deposit records in the mess.",
        managersOnly: true,
      },
      {
        question: "How do I rename or delete the mess?",
        answer:
          "Open Mess Settings from the Manager tab. Any manager can change the mess name or delete the mess.",
        tip: "Deleting a mess removes all of its data forever. It cannot be undone.",
        managersOnly: true,
      },
    ],
  },
  {
    id: "account",
    title: "Account & Offline",
    icon: "user",
    items: [
      {
        question: "How do I change my name, password or email?",
        answer:
          "Open your Profile. You can edit your name and change your password there. To change your email, we send a code to your current email to confirm it is you.",
      },
      {
        question: "Where is my mess key?",
        answer:
          "Open the side menu. The mess key is shown under MESS. Tap the copy icon to copy it.",
      },
      {
        question: "How do I delete my account?",
        answer:
          "Open your Profile and tap “Delete Account”. Confirm with your password or with a code sent to your email.",
        tip: "If you are the only manager of a mess, add another manager first. Your past meals and deposits stay in the mess so its accounts remain correct.",
      },
      {
        question: "Does the app work without internet?",
        answer:
          "Yes, most of it. You can keep working offline and your changes are saved on your phone. They sync automatically when you are back online. The banner at the top shows “You're offline”, “Syncing” or “All changes synced”.",
      },
      {
        question: "Why were some of my changes not saved?",
        answer:
          "Another manager changed the same thing before your phone could sync. To keep the accounts correct, the app shows you the latest version. When both versions matter, it asks you which one to keep.",
      },
    ],
  },
];

const QUICK_START: { icon: FeatherIcon; title: string; text: string }[] = [
  {
    icon: "home",
    title: "Join or create a mess",
    text: "Use a mess key or start your own",
  },
  {
    icon: "toggle-right",
    title: "Turn meals on or off",
    text: "Right from your Dashboard",
  },
  {
    icon: "pie-chart",
    title: "Track your balance",
    text: "See your meals, deposits and cost",
  },
];

const ALL = "all";

const itemMatches = (item: FaqItem, query: string) =>
  [item.question, item.answer, item.tip ?? "", ...(item.steps ?? [])]
    .join(" ")
    .toLowerCase()
    .includes(query);

const FaqAnswer = ({ item }: { item: FaqItem }) => (
  <View className="px-4 pb-4">
    <Text className="font-inter text-[13px] leading-[21px] text-slate-600">
      {item.answer}
    </Text>

    {item.steps ? (
      <View className="mt-2.5 gap-2">
        {item.steps.map((step, index) => (
          <View key={step} className="flex-row gap-2.5">
            <View className="mt-[1px] h-[20px] w-[20px] items-center justify-center rounded-full bg-teal-50">
              <Text className="font-inter-bold text-[10px] text-teal-700">
                {index + 1}
              </Text>
            </View>
            <Text className="flex-1 font-inter text-[13px] leading-[21px] text-slate-600">
              {step}
            </Text>
          </View>
        ))}
      </View>
    ) : null}

    {item.tip ? (
      <View className="mt-3 flex-row gap-2 rounded-[12px] border border-amber-100 bg-amber-50 px-3 py-2.5">
        <Feather
          name="info"
          size={14}
          color="#B45309"
          style={{ marginTop: 2 }}
        />
        <Text className="flex-1 font-inter text-[12px] leading-[19px] text-amber-900">
          {item.tip}
        </Text>
      </View>
    ) : null}
  </View>
);

export default function HelpFaqRoute() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>(ALL);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const isBrowsing = !normalizedQuery && activeSection === ALL;

  const visibleSections = useMemo(
    () =>
      FAQ_SECTIONS.filter(
        (section) => activeSection === ALL || section.id === activeSection,
      )
        .map((section) => ({
          ...section,
          items: normalizedQuery
            ? section.items.filter((item) => itemMatches(item, normalizedQuery))
            : section.items,
        }))
        .filter((section) => section.items.length > 0),
    [activeSection, normalizedQuery],
  );

  const resultCount = visibleSections.reduce(
    (total, section) => total + section.items.length,
    0,
  );

  const toggle = (key: string) =>
    setOpenKey((current) => (current === key ? null : key));

  const selectSection = (id: string) => {
    setActiveSection(id);
    setOpenKey(null);
  };

  const clearFilters = () => {
    setQuery("");
    setActiveSection(ALL);
  };

  return (
    <View className="flex-1 bg-[#F4F8FC]">
      <StatusBar style="light" backgroundColor="#075F5B" />

      <View className="pt-safe-offset-2 bg-[#075F5B] px-4 pb-5">
        <View className="flex-row items-center">
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
              Help & FAQ
            </Text>
            <Text className="mt-0.5 font-inter text-[11px] text-teal-100">
              Simple answers about using {appConfig.expo.name}
            </Text>
          </View>
        </View>

        <View className="mt-4 h-11 flex-row items-center rounded-[13px] bg-white px-3">
          <Feather name="search" size={17} color="#64748B" />
          <TextInput
            className="ml-2 flex-1 font-inter text-[14px] text-slate-900"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setOpenKey(null);
            }}
            placeholder="Search questions, e.g. balance"
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search help questions"
          />
          {query ? (
            <TouchableOpacity
              className="h-7 w-7 items-center justify-center rounded-full bg-slate-100"
              onPress={() => setQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x" size={14} color="#475569" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4 py-3"
          keyboardShouldPersistTaps="handled"
        >
          {[
            { id: ALL, title: "All", icon: "grid" as FeatherIcon },
            ...FAQ_SECTIONS,
          ].map((section) => {
            const selected = activeSection === section.id;
            return (
              <TouchableOpacity
                key={section.id}
                className={`h-9 flex-row items-center gap-1.5 rounded-full border px-3.5 ${
                  selected
                    ? "border-teal-700 bg-teal-700"
                    : "border-slate-200 bg-white"
                }`}
                onPress={() => selectSection(section.id)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Show ${section.title} questions`}
              >
                <Feather
                  name={section.icon}
                  size={13}
                  color={selected ? "#FFFFFF" : "#0F766E"}
                />
                <Text
                  className={`font-inter-semibold text-[12px] ${
                    selected ? "text-white" : "text-slate-700"
                  }`}
                >
                  {section.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerClassName="pb-safe-offset-[32px] pt-1"
      >
        {isBrowsing ? (
          <View className="mb-5 overflow-hidden rounded-[18px] bg-teal-700 px-4 py-4">
            <View className="flex-row items-center gap-2">
              <Feather name="zap" size={15} color="#99F6E4" />
              <Text className="font-inter-bold text-[14px] text-white">
                New here? Start with these
              </Text>
            </View>
            <View className="mt-3 gap-2.5">
              {QUICK_START.map((step, index) => (
                <View
                  key={step.title}
                  className="flex-row items-center gap-3 rounded-[12px] bg-white/10 px-3 py-2.5"
                >
                  <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-white/15">
                    <Feather name={step.icon} size={15} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-inter-semibold text-[13px] text-white">
                      {index + 1}. {step.title}
                    </Text>
                    <Text className="mt-0.5 font-inter text-[11px] text-teal-100">
                      {step.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="mb-3 flex-row items-center justify-between px-1">
            <Text className="font-inter-medium text-[12px] text-slate-500">
              {resultCount === 1 ? "1 answer" : `${resultCount} answers`}
              {normalizedQuery ? ` for “${query.trim()}”` : ""}
            </Text>
            <TouchableOpacity
              onPress={clearFilters}
              accessibilityRole="button"
              accessibilityLabel="Show all questions"
            >
              <Text className="font-inter-semibold text-[12px] text-teal-700">
                Show all
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {visibleSections.length === 0 ? (
          <View className="items-center rounded-[18px] border border-slate-200 bg-white px-6 py-10">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Feather name="search" size={20} color="#64748B" />
            </View>
            <Text className="mt-3 font-inter-bold text-[14px] text-slate-900">
              No answers found
            </Text>
            <Text className="mt-1 text-center font-inter text-[12px] leading-5 text-slate-500">
              Try a simpler word like “meal”, “deposit” or “key”.
            </Text>
          </View>
        ) : null}

        {visibleSections.map((section) => (
          <View key={section.id} className="mb-5">
            <View className="mb-2 flex-row items-center gap-2 px-1">
              <View className="h-7 w-7 items-center justify-center rounded-[9px] bg-teal-50">
                <Feather name={section.icon} size={14} color="#0F766E" />
              </View>
              <Text className="flex-1 font-inter-bold text-[14px] text-slate-900">
                {section.title}
              </Text>
              <Text className="font-inter-medium text-[11px] text-slate-400">
                {section.items.length}
              </Text>
            </View>

            <View className="overflow-hidden rounded-[16px] border border-slate-200 bg-white">
              {section.items.map((item, index) => {
                const key = `${section.id}:${item.question}`;
                const isOpen = openKey === key;
                const isLast = index === section.items.length - 1;
                return (
                  <View
                    key={key}
                    className={`${isLast ? "" : "border-b border-slate-100"} ${isOpen ? "bg-slate-50/60" : ""}`}
                  >
                    <TouchableOpacity
                      className="flex-row items-center gap-3 px-4 py-3.5"
                      onPress={() => toggle(key)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      accessibilityLabel={item.question}
                    >
                      <View className="flex-1">
                        <Text
                          className={`font-inter-semibold text-[14px] leading-5 ${
                            isOpen ? "text-teal-800" : "text-slate-900"
                          }`}
                        >
                          {item.question}
                        </Text>
                        {item.managersOnly ? (
                          <View className="mt-1.5 flex-row">
                            <View className="flex-row items-center gap-1 rounded-md bg-amber-50 px-1.5 py-[2px]">
                              <Feather
                                name="shield"
                                size={10}
                                color="#B45309"
                              />
                              <Text className="font-inter-semibold text-[10px] text-amber-700">
                                For managers
                              </Text>
                            </View>
                          </View>
                        ) : null}
                      </View>
                      <View
                        className={`h-7 w-7 items-center justify-center rounded-full ${
                          isOpen ? "bg-teal-700" : "bg-teal-50"
                        }`}
                      >
                        <Feather
                          name={isOpen ? "chevron-up" : "chevron-down"}
                          size={15}
                          color={isOpen ? "#FFFFFF" : "#0F766E"}
                        />
                      </View>
                    </TouchableOpacity>
                    {isOpen ? <FaqAnswer item={item} /> : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View className="mt-1 items-center rounded-[18px] border border-slate-200 bg-white px-5 py-6">
          <View className="h-12 w-12 items-center justify-center rounded-[14px] bg-teal-50">
            <Feather name="help-circle" size={21} color="#0F766E" />
          </View>
          <Text className="mt-3 font-inter-bold text-[15px] text-slate-900">
            Still need help?
          </Text>
          <Text className="mt-1 text-center font-inter text-[12px] leading-5 text-slate-500">
            For questions about your meals, deposits or balance, talk to your
            mess manager. For a problem with the app itself, contact us from our
            Play Store page.
          </Text>
          <TouchableOpacity
            className="mt-4 flex-row items-center gap-2 rounded-[12px] bg-teal-700 px-4 py-3"
            onPress={() => void Linking.openURL(PLAY_STORE_URL)}
            activeOpacity={0.8}
            accessibilityRole="link"
            accessibilityLabel="Open Mealager on the Play Store"
          >
            <Feather name="external-link" size={15} color="#FFFFFF" />
            <Text className="font-inter-semibold text-[13px] text-white">
              Open Play Store page
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
