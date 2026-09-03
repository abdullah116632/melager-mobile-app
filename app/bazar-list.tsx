import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  api,
  type ApiBazarItem,
} from "@/lib/api";
import { useAppDispatch, useAppSelector, useAuth } from "@/redux/hooks";
import {
  assignBazarMembers as assignBazarMembersAction,
  createBazarItem as createBazarItemAction,
  deleteBazarItem as deleteBazarItemAction,
  deleteBazarItems as deleteBazarItemsAction,
  loadBazar as loadBazarAction,
  selectBazarState,
  updateBazarItem as updateBazarItemAction,
  updateBazarItemStatus as updateBazarItemStatusAction,
} from "@/redux/slice/bazarSlice";
import { loadMonth } from "@/redux/slice/messSlice";

const getUpcomingDays = () => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    return {
      name: date.toLocaleDateString("en-US", { weekday: "long" }),
      date: date.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      key: date.toISOString().slice(0, 10),
      weekday: (date.getDay() + 1) % 7,
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
  const dispatch = useAppDispatch();
  const { mess, role, token } = useAuth();
  const isAdmin = role === "admin";
  const {
    items,
    assignments,
    consumers,
    loadStatus,
    mutationStatus,
  } = useAppSelector(selectBazarState);
  const upcomingDays = getUpcomingDays();
  const [selectedDayKey, setSelectedDayKey] = useState(upcomingDays[0]!.key);
  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [selectedConsumerIds, setSelectedConsumerIds] = useState<number[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [editingItem, setEditingItem] = useState<ApiBazarItem | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState("");
  const loading = loadStatus === "loading";
  const [refreshing, setRefreshing] = useState(false);
  const saving = mutationStatus === "loading";
  const [addingItem, setAddingItem] = useState(false);
  const [addingToExpense, setAddingToExpense] = useState(false);
  const [assignedMembersExpanded, setAssignedMembersExpanded] = useState(false);
  const selectedDay = upcomingDays.find((day) => day.key === selectedDayKey) ?? upcomingDays[0]!;
  const selectedItems = items
    .filter((item) => item.weekday === selectedDay.weekday)
    .sort((firstItem, secondItem) => secondItem.id - firstItem.id);
  const selectedItemsTotal = selectedItems.reduce(
    (total, item) => total + item.price,
    0,
  );
  const selectedAssignments = assignments.filter(
    (assignment) => assignment.weekday === selectedDay.weekday,
  );

  const loadBazar = useCallback(async (refresh = false) => {
    if (!token || !mess) return;
    if (refresh) setRefreshing(true);
    try {
      await dispatch(loadBazarAction({ includeConsumers: isAdmin })).unwrap();
    } catch (error) {
      Alert.alert(
        "Could not load bazar list",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, isAdmin, mess?.id, token]);

  useEffect(() => {
    void loadBazar();
  }, [loadBazar]);

  const addItem = async () => {
    if (!token || !mess || !itemName.trim()) return;
    const price = Number(itemPrice.trim() || "0");
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert("Invalid price", "Enter a valid non-negative price.");
      return;
    }
    setAddingItem(true);
    try {
      await dispatch(
        createBazarItemAction({ weekday: selectedDay.weekday, name: itemName.trim(), price }),
      ).unwrap();
      setItemName("");
      setItemPrice("");
    } catch (error) {
      Alert.alert("Could not add item", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setAddingItem(false);
    }
  };

  const openEditItem = (item: ApiBazarItem) => {
    setEditingItem(item);
    setEditingItemName(item.name);
    setEditingItemPrice(String(item.price));
  };

  const updateItem = async () => {
    if (!token || !mess || !editingItem || !editingItemName.trim()) return;
    const price = Number(editingItemPrice.trim() || "0");
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert("Invalid price", "Enter a valid non-negative price.");
      return;
    }
    try {
      await dispatch(
        updateBazarItemAction({ id: editingItem.id, name: editingItemName.trim(), price }),
      ).unwrap();
      setEditingItem(null);
    } catch (error) {
      Alert.alert("Could not update item", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const toggleItemCompleted = async (item: ApiBazarItem) => {
    if (!token || !mess) return;
    const completed = !item.isCompleted;
    try {
      await dispatch(updateBazarItemStatusAction({ id: item.id, completed })).unwrap();
    } catch (error) {
      Alert.alert("Could not update item", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const deleteItem = (item: ApiBazarItem) => {
    if (!token || !mess) return;
    Alert.alert("Delete bazar item?", `Remove ${item.name} from this day's list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await dispatch(deleteBazarItemAction(item.id)).unwrap();
            } catch (error) {
              Alert.alert("Could not delete item", error instanceof Error ? error.message : "Please try again.");
            }
          })();
        },
      },
    ]);
  };

  const clearAllItems = () => {
    if (!token || !mess || selectedItems.length === 0) return;
    Alert.alert("Clear all bazar items?", `Remove all items for ${selectedDay.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await dispatch(deleteBazarItemsAction(selectedDay.weekday)).unwrap();
            } catch (error) {
              Alert.alert("Could not clear items", error instanceof Error ? error.message : "Please try again.");
            }
          })();
        },
      },
    ]);
  };

  const addItemsToTodayExpense = () => {
    if (!token || !mess || items.length === 0) return;
    const today = new Date();
    const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const day = today.getDate();
    setAddingToExpense(true);
    void (async () => {
      try {
        const preview = await api.addBazarItemsToExpense(yearMonth, day, token, mess.id, true);
        if (preview.alreadyAddedAll) {
          Alert.alert("Already added", "You already added everything to today's expense.");
          return;
        }
        const itemSummary = preview.newItems
          .map((item) => `${item.name} - ৳${item.amount}`)
          .join("\n");
        Alert.alert(
          "New items to add",
          `Only these new items will be added:\n\n${itemSummary}`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Add new items",
              onPress: () => {
                void (async () => {
                  try {
                    const result = await api.addBazarItemsToExpense(yearMonth, day, token, mess.id);
                    if (!result.alreadyAddedAll) {
                      await dispatch(loadMonth({ messId: mess.id, yearMonth, force: true })).unwrap();
                    }
                    Alert.alert(
                      result.alreadyAddedAll ? "Already added" : "Expense updated",
                      result.alreadyAddedAll
                        ? "You already added everything to today's expense."
                        : `${result.newItems.length} new item${result.newItems.length === 1 ? "" : "s"} added to today's expense.`,
                    );
                  } catch (error) {
                    Alert.alert("Could not add expense", error instanceof Error ? error.message : "Please try again.");
                  } finally {
                    setAddingToExpense(false);
                  }
                })();
              },
            },
          ],
        );
      } catch (error) {
        Alert.alert("Could not check expense", error instanceof Error ? error.message : "Please try again.");
      } finally {
        setAddingToExpense(false);
      }
    })();
  };

  const submitAssignments = async () => {
    if (!token || !mess) return;
    if (selectedConsumerIds.length === 0) {
      Alert.alert("Select members", "Select at least one member to assign.");
      return;
    }
    try {
      await dispatch(
        assignBazarMembersAction({ weekday: selectedDay.weekday, consumerIds: selectedConsumerIds }),
      ).unwrap();
      setAssignPickerOpen(false);
    } catch (error) {
      Alert.alert("Could not assign member", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const toggleConsumer = (consumerId: number) => {
    setSelectedConsumerIds((current) =>
      current.includes(consumerId)
        ? current.filter((id) => id !== consumerId)
        : [...current, consumerId],
    );
  };

  return (
    <View className="pt-safe flex-1 bg-[#F4F8FC]">
      <StatusBar style="light" backgroundColor="#075F5B" />
      <View className="flex-row items-center bg-[#075F5B] px-4 pb-4 pt-2">
        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15" onPress={() => router.back()} accessibilityLabel="Back">
          <Feather name="arrow-left" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-[18px] text-white">Bazar List</Text>
          <Text className="mt-0.5 font-inter text-[11px] text-teal-100">Daily shopping planner</Text>
        </View>
        <Feather name="shopping-cart" size={20} color="#FFFFFF" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadBazar(true)} tintColor="#0F766E" />}
        contentContainerClassName="gap-4 px-4 py-4 pb-safe-offset-8"
      >
        <View className="rounded-2xl border border-slate-300 bg-white p-4" style={cardShadow}>
          <View className="flex-row items-center justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="font-inter-bold text-base text-slate-900">Select a day</Text>
              <Text className="mt-0.5 font-inter text-[10px] text-slate-500">Choose a day to view its bazar items and assigned members.</Text>
            </View>
            <TouchableOpacity className="flex-row items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5" onPress={() => setDayPickerOpen(true)} activeOpacity={0.75} accessibilityLabel="Select bazar day">
              <Feather name="calendar" size={14} color="#0369A1" />
              <Text className="font-inter-medium text-[11px] text-sky-700" numberOfLines={1}>{selectedDay.name.slice(0, 3)}, {selectedDay.date}</Text>
              <Feather name="chevron-down" size={12} color="#0369A1" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? <View className="items-center py-16"><ActivityIndicator size="large" color="#0F766E" /></View> : (
          <>
            <View className="rounded-2xl border border-slate-300 bg-white p-4" style={cardShadow}>
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"><Feather name="user-check" size={19} color="#047857" /></View>
                <TouchableOpacity className="ml-3 min-w-0 flex-1" onPress={() => setAssignedMembersExpanded((expanded) => !expanded)} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Toggle assigned members">
                  <Text className="font-inter-bold text-base text-slate-900">Assigned members</Text>
                  <Text className="mt-0.5 font-inter text-xs text-slate-500">Bazar duty for {selectedDay.name}</Text>
                </TouchableOpacity>
                {isAdmin ? <TouchableOpacity className="ml-2 h-9 flex-row items-center rounded-xl bg-emerald-600 px-2.5" onPress={() => { setSelectedConsumerIds(selectedAssignments.map((assignment) => assignment.consumerId)); setAssignPickerOpen(true); }} accessibilityLabel="Assign members"><Feather name="user-plus" size={15} color="#FFFFFF" /><Text className="ml-1.5 font-inter-semibold text-xs text-white">Assign</Text></TouchableOpacity> : null}
                <TouchableOpacity className="ml-2 h-9 w-9 items-center justify-center" onPress={() => setAssignedMembersExpanded((expanded) => !expanded)} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="Toggle assigned members"><Feather name={assignedMembersExpanded ? "chevron-up" : "chevron-down"} size={18} color="#64748B" /></TouchableOpacity>
              </View>
              {assignedMembersExpanded ? <View className="mt-4 gap-2">
                {selectedAssignments.length === 0 ? <Text className="rounded-xl bg-slate-50 px-3 py-3 font-inter text-xs text-slate-500">No one assigned</Text> : selectedAssignments.map((assignment) => <View key={assignment.id} className="rounded-xl bg-emerald-50 px-3 py-2.5"><Text className="font-inter-semibold text-sm text-emerald-800">{assignment.name ?? "Unnamed member"}</Text><Text className="mt-0.5 font-inter text-xs text-emerald-700">{assignment.email ?? "No email available"}</Text></View>)}
              </View> : null}
            </View>

            <View className="rounded-2xl border border-slate-300 bg-white p-4" style={cardShadow}>
              <View className="flex-row items-center"><View className="h-10 w-10 items-center justify-center rounded-xl bg-orange-50"><Feather name="shopping-cart" size={19} color="#C2410C" /></View><View className="ml-3 flex-1"><Text className="font-inter-bold text-base text-slate-900">Bazar items</Text><Text className="mt-0.5 font-inter text-xs text-slate-500">Items for {selectedDay.name}</Text></View><View className="items-end"><Text className="font-inter-bold text-sm text-orange-700">৳{selectedItemsTotal.toFixed(2)}</Text><Text className="font-inter text-[10px] text-slate-400">{selectedItems.length} items</Text></View>{isAdmin && selectedItems.length > 0 ? <TouchableOpacity className="ml-2 flex-row items-center rounded-lg bg-red-50 px-2.5 py-1.5" onPress={clearAllItems} disabled={saving} accessibilityLabel="Clear all bazar items"><Feather name="trash-2" size={13} color="#B91C1C" /><Text className="ml-1 font-inter-semibold text-[11px] text-red-700">Clear all</Text></TouchableOpacity> : null}</View>
              {isAdmin ? <View className="mt-4 flex-row items-center gap-2"><TextInput className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-sm text-slate-900" value={itemName} onChangeText={setItemName} placeholder="Item name" placeholderTextColor="#94A3B8" /><TextInput className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-sm text-slate-900" value={itemPrice} onChangeText={setItemPrice} placeholder="Price" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" /><TouchableOpacity className="h-11 w-11 items-center justify-center rounded-xl bg-orange-600" onPress={() => void addItem()} disabled={saving || addingItem} accessibilityLabel="Add bazar item">{addingItem ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Feather name="plus" size={20} color="#FFFFFF" />}</TouchableOpacity></View> : null}
              <View className="mt-3 gap-2">{selectedItems.length === 0 ? <Text className="font-inter text-xs text-slate-500">No items added for this day.</Text> : selectedItems.map((item) => <Pressable key={item.id} className={`flex-row items-center rounded-xl px-3 py-2.5 ${item.isCompleted ? "bg-emerald-50" : "bg-orange-50"}`} onPress={() => { if (isAdmin) openEditItem(item); }} disabled={!isAdmin} accessibilityLabel={`Edit ${item.name}`}><TouchableOpacity className="h-8 w-8 items-center justify-center" onPress={(event) => { event.stopPropagation(); void toggleItemCompleted(item); }} accessibilityRole="checkbox" accessibilityState={{ checked: item.isCompleted }} accessibilityLabel={`Mark ${item.name} as ${item.isCompleted ? "not completed" : "completed"}`}><Feather name={item.isCompleted ? "check-square" : "square"} size={19} color={item.isCompleted ? "#047857" : "#C2410C"} /></TouchableOpacity><Text className={`ml-1 min-w-0 flex-1 font-inter text-sm ${item.isCompleted ? "text-emerald-800 line-through" : "text-slate-700"}`}>{item.name}</Text>{item.price > 0 ? <Text className={`font-inter-semibold text-sm ${item.isCompleted ? "text-emerald-700" : "text-orange-700"}`}>৳{item.price}</Text> : <Text className="font-inter text-xs text-slate-400">No price</Text>}{isAdmin ? <><View className="mx-2 h-5 w-px bg-orange-200" /><TouchableOpacity className="h-8 w-8 items-center justify-center rounded-lg bg-white/70" onPress={(event) => { event.stopPropagation(); openEditItem(item); }} accessibilityLabel={`Edit ${item.name}`}><Feather name="edit-2" size={14} color={item.isCompleted ? "#047857" : "#C2410C"} /></TouchableOpacity><View className="mx-2 h-5 w-px bg-red-200" /><TouchableOpacity className="h-8 w-8 items-center justify-center rounded-lg bg-white/70" onPress={(event) => { event.stopPropagation(); deleteItem(item); }} disabled={saving} accessibilityLabel={`Delete ${item.name}`}><Feather name="trash-2" size={14} color="#B91C1C" /></TouchableOpacity></> : null}</Pressable>)}</View>
              {isAdmin && items.length > 0 ? <TouchableOpacity className="mt-3 flex-row items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5" onPress={addItemsToTodayExpense} disabled={saving || addingToExpense} accessibilityLabel="Add all bazar items to today's expense">{addingToExpense ? <ActivityIndicator size="small" color="#C2410C" /> : <Feather name="file-plus" size={16} color="#C2410C" />}<Text className="ml-2 font-inter-semibold text-xs text-orange-800">{addingToExpense ? "Adding to expense..." : "Add all items to today's expense"}</Text></TouchableOpacity> : null}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={editingItem !== null} transparent animationType="fade" onRequestClose={() => setEditingItem(null)}><Pressable className="flex-1 items-center justify-center bg-slate-900/35 px-6" onPress={() => setEditingItem(null)}><Pressable className="w-full max-w-[360px] rounded-2xl bg-white p-4" onPress={(event) => event.stopPropagation()}><View className="mb-4 flex-row items-center justify-between"><Text className="font-inter-bold text-base text-slate-900">Edit bazar item</Text><TouchableOpacity onPress={() => setEditingItem(null)} accessibilityLabel="Close edit item"><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View><TextInput className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-inter text-sm text-slate-900" value={editingItemName} onChangeText={setEditingItemName} placeholder="Item name" placeholderTextColor="#94A3B8" /><TextInput className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-inter text-sm text-slate-900" value={editingItemPrice} onChangeText={setEditingItemPrice} placeholder="Price" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" /><TouchableOpacity className="mt-4 items-center rounded-xl bg-orange-600 px-4 py-3" onPress={() => void updateItem()} disabled={saving}><Text className="font-inter-semibold text-sm text-white">{saving ? "Saving..." : "Save changes"}</Text></TouchableOpacity></Pressable></Pressable></Modal>
      <Modal visible={dayPickerOpen} transparent animationType="fade" onRequestClose={() => setDayPickerOpen(false)}><Pressable className="flex-1 items-center justify-center bg-slate-900/35 px-6" onPress={() => setDayPickerOpen(false)}><Pressable className="w-full max-w-[360px] rounded-2xl bg-white p-4" onPress={(event) => event.stopPropagation()}><View className="mb-3 flex-row items-center justify-between"><Text className="font-inter-bold text-base text-slate-900">Select bazar day</Text><TouchableOpacity onPress={() => setDayPickerOpen(false)} accessibilityLabel="Close day selector"><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View>{upcomingDays.map((day) => <TouchableOpacity key={day.key} className={`mb-2 flex-row items-center rounded-lg px-3 py-2.5 ${day.key === selectedDayKey ? "bg-sky-50" : "bg-slate-50"}`} onPress={() => { setSelectedDayKey(day.key); setDayPickerOpen(false); }}><Feather name={day.key === selectedDayKey ? "check-circle" : "calendar"} size={16} color="#0369A1" /><Text className="ml-2 flex-1 font-inter-semibold text-xs text-slate-800">{day.name}</Text><Text className="font-inter text-[10px] text-slate-500">{day.date}</Text></TouchableOpacity>)}</Pressable></Pressable></Modal>
      <Modal visible={assignPickerOpen} transparent animationType="fade" onRequestClose={() => setAssignPickerOpen(false)}><Pressable className="flex-1 items-center justify-center bg-slate-900/35 px-6" onPress={() => setAssignPickerOpen(false)}><Pressable className="h-[80%] w-full max-w-[360px] rounded-2xl bg-white p-4" onPress={(event) => event.stopPropagation()}><View className="mb-3 flex-row items-center justify-between"><Text className="font-inter-bold text-base text-slate-900">Assign members</Text><View className="flex-row items-center gap-3"><Text className="font-inter-semibold text-xs text-emerald-700">{selectedConsumerIds.length} selected</Text><TouchableOpacity onPress={() => setAssignPickerOpen(false)} accessibilityLabel="Close member selector"><Feather name="x" size={20} color="#64748B" /></TouchableOpacity></View></View><ScrollView className="min-h-0 flex-1" showsVerticalScrollIndicator contentContainerClassName="pb-1">{consumers.map((consumer) => { const selected = selectedConsumerIds.includes(consumer.id); return <TouchableOpacity key={consumer.id} className={`mb-2 flex-row items-center rounded-lg px-3 py-2.5 ${selected ? "bg-emerald-50" : "bg-slate-50"}`} onPress={() => toggleConsumer(consumer.id)} disabled={saving} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><View className={`h-5 w-5 items-center justify-center rounded-md border ${selected ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"}`}>{selected ? <Feather name="check" size={13} color="#FFFFFF" /> : null}</View><View className="ml-2 flex-1"><Text className="font-inter-semibold text-sm text-slate-800">{consumer.name}</Text><Text className="mt-0.5 font-inter text-xs text-slate-500">{consumer.email ?? "No email available"}</Text></View></TouchableOpacity>; })}</ScrollView><TouchableOpacity className="mt-2 items-center rounded-xl bg-emerald-600 px-4 py-3" onPress={() => void submitAssignments()} disabled={saving}><Text className="font-inter-semibold text-sm text-white">{saving ? "Saving..." : "Submit"}</Text></TouchableOpacity></Pressable></Pressable></Modal>
    </View>
  );
}
