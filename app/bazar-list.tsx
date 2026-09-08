import Feather from "@expo/vector-icons/Feather";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { api, type ApiBazarItem } from "@/lib/api";
import { BazarDatePicker } from "@/components/bazar/BazarDatePicker";
import { getOfflineDatabase } from "@/offline/database/connection";
import { OutboxRepository } from "@/offline/repositories/outboxRepository";
import { getDhakaDate } from "@/utils/dashboard";
import {
  formatBazarDate,
  getBazarWeekday,
  getBazarWeekdayName,
} from "@/utils/bazar";
import {
  useAppDispatch,
  useAppSelector,
  useAuth,
  useNetwork,
} from "@/redux/hooks";
import {
  assignBazarMembers as assignBazarMembersAction,
  createBazarItem as createBazarItemAction,
  deleteBazarItem as deleteBazarItemAction,
  deleteBazarItems as deleteBazarItemsAction,
  loadBazar as loadBazarAction,
  notifyBazarMembers as notifyBazarMembersAction,
  selectBazarState,
  updateBazarItem as updateBazarItemAction,
  updateBazarItemStatus as updateBazarItemStatusAction,
} from "@/redux/slice/bazarSlice";
import { loadMonth } from "@/redux/slice/messSlice";
import { markBazarAssignmentsRead } from "@/redux/slice/bazarNotificationsSlice";

const DUPLICATE_NAME_MESSAGE =
  "This item is already on the list for this day. Edit that one instead.";

const sumAmounts = (items: Array<{ amount: number }>) =>
  items.reduce((total, item) => total + item.amount, 0);

const cardShadow = {
  shadowColor: "#64748B",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.14,
  shadowRadius: 8,
  elevation: 3,
};

interface ExpenseLine {
  name: string;
  amount: number;
}

/** Drives the confirm/result sheet for booking a day's bazar into expenses. */
type ExpenseDialog =
  | { kind: "preview"; newItems: ExpenseLine[]; alreadyAdded: ExpenseLine[] }
  | { kind: "nothing"; alreadyAdded: ExpenseLine[] }
  | { kind: "done"; addedItems: ExpenseLine[] };

const modalShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.22,
  shadowRadius: 24,
  elevation: 12,
};

export default function BazarListRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const source = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  const goBack = () =>
    router.replace(
      source === "manager" ? "/(tabs)/manager" : "/(tabs)/dashboard",
    );
  const dispatch = useAppDispatch();
  const { mess, role, token, user } = useAuth();
  const { isOnline } = useNetwork();
  const { height: windowHeight } = useWindowDimensions();
  const isAdmin = role === "admin";
  const {
    items,
    assignments,
    consumers,
    loadStatus,
    mutationStatus,
    pendingCount,
    error: syncError,
  } = useAppSelector(selectBazarState);
  // Items belong to a calendar date; duty assignments stay on that date's
  // weekday, so the same person keeps the slot week after week.
  const [selectedDate, setSelectedDate] = useState(getDhakaDate());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [selectedConsumerIds, setSelectedConsumerIds] = useState<number[]>([]);
  const [itemName, setItemName] = useState("");
  const itemNameInputRef = useRef<TextInput>(null);
  const [itemPrice, setItemPrice] = useState("");
  const [editingItem, setEditingItem] = useState<ApiBazarItem | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState("");
  const hasLoadedRef = useRef(false);
  // Only the very first load blanks the page; later refreshes keep the list on
  // screen so re-entering does not flash.
  const loading = loadStatus === "loading" && !hasLoadedRef.current;
  const [refreshing, setRefreshing] = useState(false);
  const saving = mutationStatus === "loading";
  const [addingItem, setAddingItem] = useState(false);
  const [addingToExpense, setAddingToExpense] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState<ExpenseDialog | null>(
    null,
  );
  const [confirmingExpense, setConfirmingExpense] = useState(false);
  const [notifyingAssignments, setNotifyingAssignments] = useState(false);
  const [assignedMembersExpanded, setAssignedMembersExpanded] = useState(false);
  const isPastDate = selectedDate < getDhakaDate();
  const selectedWeekday = getBazarWeekday(selectedDate);
  const selectedWeekdayName = getBazarWeekdayName(selectedDate);
  const selectedItems = items
    .filter((item) => item.bazarDate === selectedDate)
    .sort((firstItem, secondItem) => {
      const createdAtDifference =
        new Date(secondItem.createdAt).getTime() -
        new Date(firstItem.createdAt).getTime();
      return createdAtDifference || secondItem.id - firstItem.id;
    });
  const selectedItemsTotal = selectedItems.reduce(
    (total, item) => total + item.price,
    0,
  );
  const selectedAssignments = assignments.filter(
    (assignment) => assignment.weekday === selectedWeekday,
  );
  const expenseLines =
    expenseDialog === null
      ? []
      : expenseDialog.kind === "done"
        ? expenseDialog.addedItems
        : expenseDialog.kind === "preview"
          ? expenseDialog.newItems
          : [];
  const dayHasItemNamed = (name: string, exceptItemId?: number) =>
    selectedItems.some(
      (item) => item.name === name && item.id !== exceptItemId,
    );
  // Tomorrow's duty can be announced a day early; a past day cannot.
  const canNotify =
    !isPastDate && selectedItems.length > 0 && selectedAssignments.length > 0;

  const loadBazar = useCallback(
    async ({ refresh = false, silent = false } = {}) => {
      if (!token || !mess) return;
      if (refresh) setRefreshing(true);
      try {
        await dispatch(loadBazarAction({ includeConsumers: isAdmin })).unwrap();
        hasLoadedRef.current = true;
      } catch (error) {
        // A background refresh reports through the banner instead of stealing
        // focus with a dialog.
        if (!silent) {
          Alert.alert(
            "Could not load bazar list",
            error instanceof Error ? error.message : "Please try again.",
          );
        }
      } finally {
        setRefreshing(false);
      }
    },
    [dispatch, isAdmin, mess?.id, token],
  );

  useFocusEffect(
    useCallback(() => {
      if (!token || !mess) return undefined;
      void dispatch(markBazarAssignmentsRead());
      // Entering the page shows what others changed without a manual pull.
      // This is safe for unsent work: the sync engine pushes the outbox before
      // pulling, and the snapshot merge skips rows that still have a queued
      // mutation, so nothing saved offline is overwritten.
      void loadBazar({ silent: true });
      return undefined;
    }, [dispatch, loadBazar, mess?.id, token]),
  );

  useEffect(() => {
    // Focus already covers the first load; this is for regaining connectivity
    // while the page stays open.
    if (!hasLoadedRef.current) return;
    void loadBazar({ silent: true });
  }, [isOnline, loadBazar]);

  const addItem = async () => {
    if (!token || !mess || !itemName.trim()) return;
    const name = itemName.trim();
    const price = Number(itemPrice.trim() || "0");
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert("Invalid price", "Enter a valid non-negative price.");
      return;
    }
    if (dayHasItemNamed(name)) {
      Alert.alert("Duplicate item", DUPLICATE_NAME_MESSAGE);
      return;
    }
    setAddingItem(true);
    try {
      await dispatch(
        createBazarItemAction({ bazarDate: selectedDate, name, price }),
      ).unwrap();
      setItemName("");
      setItemPrice("");
      requestAnimationFrame(() => itemNameInputRef.current?.focus());
    } catch (error) {
      Alert.alert(
        "Could not add item",
        error instanceof Error ? error.message : "Please try again.",
      );
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
    const name = editingItemName.trim();
    const price = Number(editingItemPrice.trim() || "0");
    if (!Number.isFinite(price) || price < 0) {
      Alert.alert("Invalid price", "Enter a valid non-negative price.");
      return;
    }
    if (dayHasItemNamed(name, editingItem.id)) {
      Alert.alert("Duplicate item", DUPLICATE_NAME_MESSAGE);
      return;
    }
    try {
      await dispatch(
        updateBazarItemAction({ id: editingItem.id, name, price }),
      ).unwrap();
      setEditingItem(null);
    } catch (error) {
      Alert.alert(
        "Could not update item",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const toggleItemCompleted = async (item: ApiBazarItem) => {
    if (!token || !mess) return;
    const completed = !item.isCompleted;
    try {
      await dispatch(
        updateBazarItemStatusAction({ id: item.id, completed }),
      ).unwrap();
    } catch (error) {
      Alert.alert(
        "Could not update item",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const deleteItem = (item: ApiBazarItem) => {
    if (!token || !mess) return;
    Alert.alert(
      "Delete bazar item?",
      `Remove ${item.name} from this day's list?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await dispatch(deleteBazarItemAction(item.id)).unwrap();
              } catch (error) {
                Alert.alert(
                  "Could not delete item",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  const clearAllItems = () => {
    if (!token || !mess || selectedItems.length === 0) return;
    Alert.alert(
      "Clear all bazar items?",
      `Remove all items for ${formatBazarDate(selectedDate)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await dispatch(deleteBazarItemsAction(selectedDate)).unwrap();
              } catch (error) {
                Alert.alert(
                  "Could not clear items",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
            })();
          },
        },
      ],
    );
  };

  // A day's list is booked onto that same day's expense, past or future. The
  // expense stores copies of name and price, so deleting a bazar item later
  // leaves the ledger untouched.
  const addItemsToExpense = () => {
    if (!token || !mess || selectedItems.length === 0) return;
    if (!isOnline) {
      void (async () => {
        if (!user) return;
        const database = await getOfflineDatabase();
        await new OutboxRepository(database).enqueue({
          userId: user.id,
          messId: mess.id,
          entityType: "bazar_expense",
          entityId: `${mess.id}:${selectedDate}`,
          operation: "command",
          payload: { bazarDate: selectedDate },
          dedupeKey: `bazar:expense:${mess.id}:${selectedDate}`,
        });
        Alert.alert(
          "Saved offline",
          "This expense update will be added when you are online.",
        );
      })().catch((error) =>
        Alert.alert(
          "Could not save offline",
          error instanceof Error ? error.message : "Please try again.",
        ),
      );
      return;
    }

    setAddingToExpense(true);
    void (async () => {
      try {
        const preview = await api.addBazarItemsToExpense(
          selectedDate,
          token,
          mess.id,
          true,
        );
        setExpenseDialog(
          preview.newItems.length === 0
            ? { kind: "nothing", alreadyAdded: preview.alreadyAddedItems }
            : {
                kind: "preview",
                newItems: preview.newItems,
                alreadyAdded: preview.alreadyAddedItems,
              },
        );
      } catch (error) {
        Alert.alert(
          "Could not check expense",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setAddingToExpense(false);
      }
    })();
  };

  const confirmAddToExpense = () => {
    if (!token || !mess) return;
    const yearMonth = selectedDate.slice(0, 7);
    setConfirmingExpense(true);
    void (async () => {
      try {
        const result = await api.addBazarItemsToExpense(
          selectedDate,
          token,
          mess.id,
        );
        if (result.added) {
          // Best-effort: the expense is already saved, so a refresh that
          // cannot run must not be reported as a failed add. loadMonth is
          // rejected outright by its own `condition` when that month is
          // already refreshing, which the socket event from this very write
          // tends to have started.
          await dispatch(
            loadMonth({ messId: mess.id, yearMonth, force: true }),
          );
        }
        setExpenseDialog(
          result.added
            ? { kind: "done", addedItems: result.newItems }
            : { kind: "nothing", alreadyAdded: [] },
        );
      } catch (error) {
        setExpenseDialog(null);
        Alert.alert(
          "Could not add expense",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setConfirmingExpense(false);
      }
    })();
  };

  const submitAssignments = async () => {
    if (!token || !mess) return;
    try {
      await dispatch(
        assignBazarMembersAction({
          weekday: selectedWeekday,
          consumerIds: selectedConsumerIds,
        }),
      ).unwrap();
      setAssignPickerOpen(false);
    } catch (error) {
      Alert.alert(
        "Could not assign member",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const notifyAssignedMembers = async () => {
    if (!token || !mess || selectedAssignments.length === 0) return;
    setNotifyingAssignments(true);
    try {
      const result = await dispatch(
        notifyBazarMembersAction({ bazarDate: selectedDate }),
      ).unwrap();
      Alert.alert(
        result.queued ? "Saved offline" : "Notifications sent",
        result.queued
          ? "Assigned members will be notified when you are online."
          : "Assigned members have been notified.",
      );
    } catch (error) {
      Alert.alert(
        "Could not notify members",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setNotifyingAssignments(false);
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
    <View className="flex-1 bg-[#F4F8FC]">
      <StatusBar style="light" backgroundColor="#075F5B" />
      {/* The header owns the top inset so the status bar strip is green too. */}
      <View className="pt-safe-offset-2 flex-row items-center bg-[#075F5B] px-4 pb-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/15"
          onPress={goBack}
          accessibilityLabel="Back"
        >
          <Feather name="arrow-left" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text className="font-inter-bold text-[18px] text-white">
            Bazar List
          </Text>
          <Text className="mt-0.5 font-inter text-[11px] text-teal-100">
            Daily shopping planner
          </Text>
        </View>
        <Feather name="shopping-cart" size={20} color="#FFFFFF" />
      </View>

      {syncError ? (
        <View className="border-b border-amber-200 bg-amber-50 px-4 py-2">
          <Text className="font-inter-medium text-[11px] text-amber-800">
            {syncError}
          </Text>
        </View>
      ) : pendingCount > 0 ? (
        <View className="border-b border-sky-200 bg-sky-50 px-4 py-2">
          <Text className="font-inter-medium text-[11px] text-sky-800">
            Saved locally · {pendingCount} change
            {pendingCount === 1 ? "" : "s"} waiting to sync.
          </Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadBazar({ refresh: true })}
            tintColor="#0F766E"
          />
        }
        contentContainerClassName="gap-4 px-4 py-4 pb-safe-offset-8"
      >
        <View className="items-center">
          <TouchableOpacity
            className="flex-row items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5"
            onPress={() => setDatePickerOpen(true)}
            activeOpacity={0.75}
            accessibilityLabel="Select bazar date"
          >
            <Feather name="calendar" size={15} color="#0369A1" />
            <Text
              className="font-inter-semibold text-[13px] text-sky-700"
              numberOfLines={1}
            >
              {selectedWeekdayName}, {formatBazarDate(selectedDate)}
            </Text>
            <Feather name="chevron-down" size={14} color="#0369A1" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#0F766E" />
          </View>
        ) : (
          <>
            <View
              className="rounded-2xl border border-slate-300 bg-white p-4"
              style={cardShadow}
            >
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Feather name="user-check" size={19} color="#047857" />
                </View>
                <TouchableOpacity
                  className="ml-3 min-w-0 flex-1"
                  onPress={() =>
                    setAssignedMembersExpanded((expanded) => !expanded)
                  }
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle assigned members"
                >
                  <Text className="font-inter-bold text-base text-slate-900">
                    Assigned members
                  </Text>
                  <Text className="mt-0.5 font-inter text-xs text-slate-500">
                    Bazar duty for every {selectedWeekdayName}
                  </Text>
                </TouchableOpacity>
                {isAdmin ? (
                  <TouchableOpacity
                    className="ml-2 h-9 flex-row items-center rounded-xl bg-emerald-600 px-2.5"
                    onPress={() => {
                      setSelectedConsumerIds(
                        selectedAssignments.map(
                          (assignment) => assignment.consumerId,
                        ),
                      );
                      setAssignPickerOpen(true);
                    }}
                    accessibilityLabel="Assign members"
                  >
                    <Feather name="user-plus" size={15} color="#FFFFFF" />
                    <Text className="ml-1.5 font-inter-semibold text-xs text-white">
                      Assign
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  className="ml-2 h-9 w-9 items-center justify-center"
                  onPress={() =>
                    setAssignedMembersExpanded((expanded) => !expanded)
                  }
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle assigned members"
                >
                  <Feather
                    name={
                      assignedMembersExpanded ? "chevron-up" : "chevron-down"
                    }
                    size={18}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
              {assignedMembersExpanded ? (
                <View className="mt-4 gap-2">
                  {selectedAssignments.length === 0 ? (
                    <Text className="rounded-xl bg-slate-50 px-3 py-3 font-inter text-xs text-slate-500">
                      No one assigned
                    </Text>
                  ) : (
                    selectedAssignments.map((assignment) => (
                      <View
                        key={assignment.id}
                        className="rounded-xl bg-emerald-50 px-3 py-2.5"
                      >
                        <Text className="font-inter-semibold text-sm text-emerald-800">
                          {assignment.name ?? "Unnamed member"}
                        </Text>
                        <Text className="mt-0.5 font-inter text-xs text-emerald-700">
                          {assignment.email ?? "No email available"}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
              {isAdmin ? (
                <View className="mt-3">
                  <TouchableOpacity
                    className={`flex-row items-center justify-center rounded-xl border px-3 py-2.5 ${canNotify ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-100"}`}
                    onPress={() => void notifyAssignedMembers()}
                    disabled={notifyingAssignments || !canNotify}
                    accessibilityLabel="Notify assigned members"
                    accessibilityState={{ disabled: !canNotify }}
                  >
                    <Feather
                      name="bell"
                      size={15}
                      color={canNotify ? "#047857" : "#94A3B8"}
                    />
                    {notifyingAssignments ? (
                      <ActivityIndicator
                        className="ml-2"
                        size="small"
                        color="#047857"
                      />
                    ) : (
                      <Text
                        className={`ml-2 font-inter-semibold text-xs ${canNotify ? "text-emerald-800" : "text-slate-400"}`}
                      >
                        Notify assigned members
                      </Text>
                    )}
                  </TouchableOpacity>
                  {isPastDate ? (
                    <Text className="mt-1.5 font-inter text-[11px] text-slate-500">
                      A past day cannot be notified. Pick today or a later day.
                    </Text>
                  ) : selectedItems.length === 0 ? (
                    <Text className="mt-1.5 font-inter text-[11px] text-slate-500">
                      Add an item for this day before sending a notification.
                    </Text>
                  ) : selectedAssignments.length === 0 ? (
                    <Text className="mt-1.5 font-inter text-[11px] text-slate-500">
                      Assign at least one member before sending a notification.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View
              className="rounded-2xl border border-slate-300 bg-white p-4"
              style={cardShadow}
            >
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                  <Feather name="shopping-cart" size={19} color="#C2410C" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-inter-bold text-base text-slate-900">
                    Bazar items
                  </Text>
                  <Text className="mt-0.5 font-inter text-xs text-slate-500">
                    Items for {formatBazarDate(selectedDate)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="font-inter-bold text-sm text-orange-700">
                    ৳{selectedItemsTotal.toFixed(2)}
                  </Text>
                  <Text className="font-inter text-[10px] text-slate-400">
                    {selectedItems.length} items
                  </Text>
                </View>
                {selectedItems.length > 0 ? (
                  <TouchableOpacity
                    className="ml-2 flex-row items-center rounded-lg bg-red-50 px-2.5 py-1.5"
                    onPress={clearAllItems}
                    disabled={saving}
                    accessibilityLabel="Clear all bazar items"
                  >
                    <Feather name="trash-2" size={13} color="#B91C1C" />
                    <Text className="ml-1 font-inter-semibold text-[11px] text-red-700">
                      Clear all
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View className="mt-4 flex-row items-center gap-2">
                <TextInput
                  ref={itemNameInputRef}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-sm text-slate-900"
                  value={itemName}
                  onChangeText={setItemName}
                  placeholder="Item name"
                  placeholderTextColor="#94A3B8"
                />
                <TextInput
                  className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-inter text-sm text-slate-900"
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  placeholder="Price"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  className="h-11 w-11 items-center justify-center rounded-xl bg-orange-600"
                  onPress={() => void addItem()}
                  disabled={saving || addingItem}
                  accessibilityLabel="Add bazar item"
                >
                  {addingItem ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="plus" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
              <View className="mt-3 gap-2">
                {selectedItems.length === 0 ? (
                  <Text className="font-inter text-xs text-slate-500">
                    No items added for this day.
                  </Text>
                ) : (
                  selectedItems.map((item) => (
                    <View
                      key={item.id}
                      className={`flex-row items-center rounded-xl px-3 py-2.5 ${item.isCompleted ? "bg-emerald-50" : "bg-orange-50"}`}
                    >
                      <TouchableOpacity
                        className="h-8 w-8 items-center justify-center"
                        onPress={() => void toggleItemCompleted(item)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.isCompleted }}
                        accessibilityLabel={`Mark ${item.name} as ${item.isCompleted ? "not completed" : "completed"}`}
                      >
                        <Feather
                          name={item.isCompleted ? "check-square" : "square"}
                          size={19}
                          color={item.isCompleted ? "#047857" : "#C2410C"}
                        />
                      </TouchableOpacity>
                      <Text
                        className={`ml-1 min-w-0 flex-1 font-inter text-sm ${item.isCompleted ? "text-emerald-800 line-through" : "text-slate-700"}`}
                      >
                        {item.name}
                      </Text>
                      {item.price > 0 ? (
                        <Text
                          className={`font-inter-semibold text-sm ${item.isCompleted ? "text-emerald-700" : "text-orange-700"}`}
                        >
                          ৳{item.price}
                        </Text>
                      ) : (
                        <Text className="font-inter text-xs text-slate-400">
                          No price
                        </Text>
                      )}
                      <View className="mx-2 h-5 w-px bg-orange-200" />
                      <TouchableOpacity
                        className="h-8 w-8 items-center justify-center rounded-lg bg-white/70"
                        onPress={() => openEditItem(item)}
                        accessibilityLabel={`Edit ${item.name}`}
                      >
                        <Feather
                          name="edit-2"
                          size={14}
                          color={item.isCompleted ? "#047857" : "#C2410C"}
                        />
                      </TouchableOpacity>
                      <View className="mx-2 h-5 w-px bg-red-200" />
                      <TouchableOpacity
                        className="h-8 w-8 items-center justify-center rounded-lg bg-white/70"
                        onPress={() => deleteItem(item)}
                        disabled={saving}
                        accessibilityLabel={`Delete ${item.name}`}
                      >
                        <Feather name="trash-2" size={14} color="#B91C1C" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
              {isAdmin && selectedItems.length > 0 ? (
                <TouchableOpacity
                  className="mt-3 flex-row items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5"
                  onPress={addItemsToExpense}
                  disabled={saving || addingToExpense}
                  accessibilityLabel="Add this day's bazar items to that day's expense"
                >
                  {addingToExpense ? (
                    <ActivityIndicator size="small" color="#C2410C" />
                  ) : (
                    <Feather name="file-plus" size={16} color="#C2410C" />
                  )}
                  <Text className="ml-2 font-inter-semibold text-xs text-orange-800">
                    {addingToExpense
                      ? "Adding to expense..."
                      : "Add these items to this day's expense"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={editingItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItem(null)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            className="flex-1 items-center justify-center bg-slate-900/45 px-6"
            onPress={() => setEditingItem(null)}
          >
            <Pressable
              className="w-full max-w-[360px] overflow-hidden rounded-3xl bg-white"
              style={modalShadow}
              onPress={(event) => event.stopPropagation()}
            >
              <View className="flex-row items-center border-b border-slate-100 px-4 py-3.5">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                  <Feather name="edit-3" size={18} color="#C2410C" />
                </View>
                <View className="ml-3 min-w-0 flex-1">
                  <Text className="font-inter-bold text-base text-slate-900">
                    Edit item
                  </Text>
                  <Text
                    className="mt-0.5 font-inter text-[11px] text-slate-500"
                    numberOfLines={1}
                  >
                    {formatBazarDate(selectedDate)}
                  </Text>
                </View>
                <TouchableOpacity
                  className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                  onPress={() => setEditingItem(null)}
                  accessibilityLabel="Close edit item"
                >
                  <Feather name="x" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View className="px-4 pt-4">
                <Text className="mb-1.5 font-inter-semibold text-[10px] uppercase tracking-wider text-slate-500">
                  Item name
                </Text>
                <TextInput
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-inter text-sm text-slate-900"
                  value={editingItemName}
                  onChangeText={setEditingItemName}
                  placeholder="Item name"
                  placeholderTextColor="#94A3B8"
                />
                <Text className="mb-1.5 mt-4 font-inter-semibold text-[10px] uppercase tracking-wider text-slate-500">
                  Price
                </Text>
                <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                  <Text className="font-inter-semibold text-sm text-slate-400">
                    ৳
                  </Text>
                  <TextInput
                    className="ml-2 min-w-0 flex-1 py-3 font-inter text-sm text-slate-900"
                    value={editingItemPrice}
                    onChangeText={setEditingItemPrice}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View className="mt-5 flex-row gap-2 border-t border-slate-100 px-4 py-3">
                <TouchableOpacity
                  className="flex-1 items-center rounded-xl border border-slate-200 py-3"
                  onPress={() => setEditingItem(null)}
                  disabled={saving}
                >
                  <Text className="font-inter-semibold text-sm text-slate-600">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 items-center justify-center rounded-xl py-3 ${saving || !editingItemName.trim() ? "bg-orange-300" : "bg-orange-600"}`}
                  onPress={() => void updateItem()}
                  disabled={saving || !editingItemName.trim()}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="font-inter-semibold text-sm text-white">
                      Save changes
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      <BazarDatePicker
        visible={datePickerOpen}
        selectedDate={selectedDate}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setDatePickerOpen(false);
        }}
      />
      <Modal
        visible={expenseDialog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setExpenseDialog(null)}
      >
        <View className="flex-1 items-center justify-center px-6">
          <Pressable
            className="absolute inset-0 bg-slate-900/45"
            onPress={() => !confirmingExpense && setExpenseDialog(null)}
            accessibilityLabel="Dismiss expense dialog"
          />
          <View
            className="w-full max-w-[360px] overflow-hidden rounded-3xl bg-white"
            style={[modalShadow, { maxHeight: windowHeight * 0.8 }]}
          >
            <View className="flex-row items-center border-b border-slate-100 px-4 py-3.5">
              <View
                className={`h-10 w-10 items-center justify-center rounded-xl ${expenseDialog?.kind === "done" ? "bg-emerald-50" : "bg-orange-50"}`}
              >
                <Feather
                  name={
                    expenseDialog?.kind === "done"
                      ? "check-circle"
                      : "file-plus"
                  }
                  size={18}
                  color={expenseDialog?.kind === "done" ? "#047857" : "#C2410C"}
                />
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text className="font-inter-bold text-base text-slate-900">
                  {expenseDialog?.kind === "done"
                    ? "Expense updated"
                    : expenseDialog?.kind === "nothing"
                      ? "Already added"
                      : "Add to this day's expense"}
                </Text>
                <Text
                  className="mt-0.5 font-inter text-[11px] text-slate-500"
                  numberOfLines={1}
                >
                  {formatBazarDate(selectedDate)}
                </Text>
              </View>
              {confirmingExpense ? null : (
                <TouchableOpacity
                  className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                  onPress={() => setExpenseDialog(null)}
                  accessibilityLabel="Close expense dialog"
                >
                  <Feather name="x" size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {expenseDialog?.kind === "nothing" ? (
              <View className="items-center px-6 py-10">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                  <Feather name="check" size={24} color="#047857" />
                </View>
                <Text className="mt-3 text-center font-inter-semibold text-sm text-slate-700">
                  Everything is already added
                </Text>
                <Text className="mt-1 text-center font-inter text-xs text-slate-500">
                  {expenseDialog.alreadyAdded.length > 0
                    ? `All ${expenseDialog.alreadyAdded.length} item${expenseDialog.alreadyAdded.length === 1 ? "" : "s"} from this list are already booked on this day.`
                    : "This list is already in this day's expense."}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={{ flexShrink: 1 }}
                showsVerticalScrollIndicator
                contentContainerClassName="px-4 py-4"
              >
                {expenseDialog?.kind === "preview" &&
                expenseDialog.alreadyAdded.length > 0 ? (
                  <View className="mb-4">
                    <View className="mb-2 flex-row items-center">
                      <Feather name="check" size={13} color="#94A3B8" />
                      <Text className="ml-1.5 font-inter-semibold text-[10px] uppercase tracking-wider text-slate-400">
                        Already in the expense
                      </Text>
                    </View>
                    <View className="gap-1.5">
                      {expenseDialog.alreadyAdded.map((line, index) => (
                        <View
                          key={`${line.name}-${index}`}
                          className="flex-row items-center rounded-xl bg-slate-50 px-3 py-2"
                        >
                          <Text
                            className="min-w-0 flex-1 font-inter text-[13px] text-slate-400 line-through"
                            numberOfLines={1}
                          >
                            {line.name}
                          </Text>
                          <Text className="font-inter text-[13px] text-slate-400">
                            ৳{line.amount}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View className="mb-2 flex-row items-center">
                  <Feather
                    name="plus-circle"
                    size={13}
                    color={
                      expenseDialog?.kind === "done" ? "#047857" : "#C2410C"
                    }
                  />
                  <Text
                    className={`ml-1.5 font-inter-semibold text-[10px] uppercase tracking-wider ${expenseDialog?.kind === "done" ? "text-emerald-700" : "text-orange-700"}`}
                  >
                    {expenseDialog?.kind === "done"
                      ? "Added just now"
                      : expenseDialog?.kind === "preview" &&
                          expenseDialog.alreadyAdded.length > 0
                        ? "Only these will be added"
                        : "Items to add"}
                  </Text>
                </View>
                <View className="gap-1.5">
                  {expenseLines.map((line, index) => (
                    <View
                      key={`${line.name}-${index}`}
                      className={`flex-row items-center rounded-xl px-3 py-2.5 ${expenseDialog?.kind === "done" ? "bg-emerald-50" : "bg-orange-50"}`}
                    >
                      <Text
                        className="min-w-0 flex-1 font-inter text-[13px] text-slate-700"
                        numberOfLines={1}
                      >
                        {line.name}
                      </Text>
                      <Text
                        className={`font-inter-semibold text-[13px] ${expenseDialog?.kind === "done" ? "text-emerald-700" : "text-orange-700"}`}
                      >
                        ৳{line.amount}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="mt-4 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <Text className="font-inter-semibold text-xs text-slate-600">
                    {expenseLines.length} item
                    {expenseLines.length === 1 ? "" : "s"}
                  </Text>
                  <Text
                    className={`font-inter-bold text-base ${expenseDialog?.kind === "done" ? "text-emerald-700" : "text-orange-700"}`}
                  >
                    ৳{sumAmounts(expenseLines).toFixed(2)}
                  </Text>
                </View>
              </ScrollView>
            )}

            <View className="flex-row gap-2 border-t border-slate-100 px-4 py-3">
              {expenseDialog?.kind === "preview" ? (
                <>
                  <TouchableOpacity
                    className="flex-1 items-center rounded-xl border border-slate-200 py-3"
                    onPress={() => setExpenseDialog(null)}
                    disabled={confirmingExpense}
                  >
                    <Text className="font-inter-semibold text-sm text-slate-600">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 items-center justify-center rounded-xl py-3 ${confirmingExpense ? "bg-orange-300" : "bg-orange-600"}`}
                    onPress={confirmAddToExpense}
                    disabled={confirmingExpense}
                  >
                    {confirmingExpense ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="font-inter-semibold text-sm text-white">
                        Add {expenseDialog.newItems.length} item
                        {expenseDialog.newItems.length === 1 ? "" : "s"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  className="flex-1 items-center rounded-xl bg-slate-900 py-3"
                  onPress={() => setExpenseDialog(null)}
                >
                  <Text className="font-inter-semibold text-sm text-white">
                    Done
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={assignPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignPickerOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-slate-900/35 px-6"
          onPress={() => setAssignPickerOpen(false)}
        >
          <Pressable
            className="h-[80%] w-full max-w-[360px] rounded-2xl bg-white p-4"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-inter-bold text-base text-slate-900">
                Assign members
              </Text>
              <View className="flex-row items-center gap-3">
                <Text className="font-inter-semibold text-xs text-emerald-700">
                  {selectedConsumerIds.length} selected
                </Text>
                <TouchableOpacity
                  onPress={() => setAssignPickerOpen(false)}
                  accessibilityLabel="Close member selector"
                >
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              className="min-h-0 flex-1"
              showsVerticalScrollIndicator
              contentContainerClassName="pb-1"
            >
              {consumers.map((consumer) => {
                const selected = selectedConsumerIds.includes(consumer.id);
                return (
                  <TouchableOpacity
                    key={consumer.id}
                    className={`mb-2 flex-row items-center rounded-lg px-3 py-2.5 ${selected ? "bg-emerald-50" : "bg-slate-50"}`}
                    onPress={() => toggleConsumer(consumer.id)}
                    disabled={saving}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-md border ${selected ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"}`}
                    >
                      {selected ? (
                        <Feather name="check" size={13} color="#FFFFFF" />
                      ) : null}
                    </View>
                    <View className="ml-2 flex-1">
                      <Text className="font-inter-semibold text-sm text-slate-800">
                        {consumer.name}
                      </Text>
                      <Text className="mt-0.5 font-inter text-xs text-slate-500">
                        {consumer.email ?? "No email available"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              className="mt-2 items-center rounded-xl bg-emerald-600 px-4 py-3"
              onPress={() => void submitAssignments()}
              disabled={saving}
            >
              <Text className="font-inter-semibold text-sm text-white">
                {saving ? "Saving..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
