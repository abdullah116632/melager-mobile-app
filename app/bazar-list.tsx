import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const getUpcomingDays = () => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return {
      name: date.toLocaleDateString("en-US", { weekday: "long" }),
      date: date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      key: date.toISOString().slice(0, 10),
    };
  });
};

const cardShadow = {
  shadowColor: "#64748B",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.14,
  shadowRadius: 8,
  elevation: 3,
};

export default function BazarListRoute() {
  const router = useRouter();
  const upcomingDays = getUpcomingDays();
  const [selectedDayKey, setSelectedDayKey] = useState(upcomingDays[0]!.key);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemsByDay, setItemsByDay] = useState<Record<string, string[]>>({});
  const selectedDay =
    upcomingDays.find((day) => day.key === selectedDayKey) ?? upcomingDays[0]!;
  const items = itemsByDay[selectedDayKey] ?? [];

  const addItem = () => {
    const nextItem = itemName.trim();
    if (!nextItem) return;
    setItemsByDay((current) => ({
      ...current,
      [selectedDayKey]: [...(current[selectedDayKey] ?? []), nextItem],
    }));
    setItemName("");
    Alert.alert("Item added", `${nextItem} added for ${selectedDay.name}.`);
  };

  return (
    <View className="pt-safe flex-1 bg-[#F4F8FC]">
      <StatusBar style="light" backgroundColor="#075F5B" />
      <View className="flex-row items-center bg-[#075F5B] px-4 pb-4 pt-2">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15"
          onPress={() => router.back()}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-[18px] text-white">Bazar List</Text>
          <Text className="mt-0.5 font-inter text-[11px] text-teal-100">
            Daily shopping planner
          </Text>
        </View>
        <Feather name="shopping-cart" size={20} color="#FFFFFF" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-4 py-4 pb-safe-offset-8"
      >
        <View className="rounded-2xl border border-slate-300 bg-white p-4" style={cardShadow}>
          <Text className="font-inter-bold text-base text-slate-900">Select a day</Text>
          <TouchableOpacity
            className="mt-3 flex-row items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-3"
            onPress={() => setDayPickerOpen(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Select bazar day"
          >
            <Feather name="calendar" size={17} color="#0369A1" />
            <View className="ml-2 flex-1">
              <Text className="font-inter-bold text-sm text-slate-900">{selectedDay.name}</Text>
              <Text className="mt-0.5 font-inter text-[10px] text-slate-500">{selectedDay.date}</Text>
            </View>
            <Feather name={dayPickerOpen ? "chevron-up" : "chevron-down"} size={17} color="#0369A1" />
          </TouchableOpacity>
        </View>

        <View className="rounded-2xl border border-slate-300 bg-white p-4" style={cardShadow}>
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <Feather name="user-check" size={19} color="#047857" />
            </View>
            <View className="ml-3">
              <Text className="font-inter-bold text-base text-slate-900">Assigned member</Text>
              <Text className="mt-0.5 font-inter text-xs text-slate-500">The member responsible for {selectedDay.name}</Text>
            </View>
          </View>
          <View className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4">
            <Text className="font-inter-semibold text-sm text-slate-500">No member assigned yet</Text>
            <Text className="mt-1 font-inter text-xs text-slate-400">Member name and email will appear here after assignment.</Text>
            <TouchableOpacity
              className="mt-3 flex-row items-center self-start rounded-xl bg-emerald-600 px-3 py-2.5"
              onPress={() => Alert.alert("Assign member", "Member selection will be available here.")}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Assign member"
            >
              <Feather name="user-plus" size={15} color="#FFFFFF" />
              <Text className="ml-1.5 font-inter-semibold text-xs text-white">Assign member</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="rounded-2xl border border-slate-300 bg-white p-4" style={cardShadow}>
          <View className="flex-row items-center">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Feather name="shopping-cart" size={19} color="#C2410C" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-inter-bold text-base text-slate-900">Bazar items</Text>
              <Text className="mt-0.5 font-inter text-xs text-slate-500">Add items needed for {selectedDay.name}</Text>
            </View>
            <Text className="font-inter-bold text-sm text-orange-700">{items.length}</Text>
          </View>
          <View className="mt-4 flex-row items-center gap-2">
            <TextInput
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-sm text-slate-900"
              value={itemName}
              onChangeText={setItemName}
              placeholder="Add an item"
              placeholderTextColor="#94A3B8"
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <TouchableOpacity className="h-11 w-11 items-center justify-center rounded-xl bg-orange-600" onPress={addItem} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Add bazar item">
              <Feather name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {items.length > 0 ? (
            <View className="mt-3 gap-2">
              {items.map((item, index) => (
                <View key={`${item}-${index}`} className="flex-row items-center rounded-xl bg-orange-50 px-3 py-2.5">
                  <Feather name="check-circle" size={15} color="#C2410C" />
                  <Text className="ml-2 flex-1 font-inter text-sm text-slate-700">{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={dayPickerOpen} transparent animationType="fade" onRequestClose={() => setDayPickerOpen(false)}>
        <Pressable className="flex-1 items-center justify-center bg-slate-900/35 px-6" onPress={() => setDayPickerOpen(false)}>
          <Pressable className="w-full max-w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/20">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-inter-bold text-base text-slate-900">Select bazar day</Text>
              <TouchableOpacity className="h-8 w-8 items-center justify-center rounded-lg bg-slate-100" onPress={() => setDayPickerOpen(false)} accessibilityLabel="Close day picker">
                <Feather name="x" size={16} color="#475569" />
              </TouchableOpacity>
            </View>
            <View className="gap-2">
              {upcomingDays.map((day) => (
                <TouchableOpacity key={day.key} className={`flex-row items-center rounded-lg px-3 py-2.5 ${day.key === selectedDayKey ? "bg-sky-50" : "bg-slate-50"}`} onPress={() => { setSelectedDayKey(day.key); setDayPickerOpen(false); }} accessibilityRole="radio" accessibilityState={{ selected: day.key === selectedDayKey }}>
                  <Feather name={day.key === selectedDayKey ? "check-circle" : "calendar"} size={16} color={day.key === selectedDayKey ? "#0369A1" : "#64748B"} />
                  <Text className="ml-2 flex-1 font-inter-semibold text-xs text-slate-800">{day.name}</Text>
                  {day.key === upcomingDays[0]!.key ? (
                    <Text className="mr-2 font-inter-semibold text-[10px] text-sky-700">
                      Today
                    </Text>
                  ) : null}
                  <Text className="font-inter text-[10px] text-slate-500">{day.date}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
