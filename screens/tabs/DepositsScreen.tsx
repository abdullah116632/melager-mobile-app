import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddDepositConsumerModal } from "@/components/deposits/AddDepositConsumerModal";
import { AddDepositModal } from "@/components/deposits/AddDepositModal";
import { DepositHistoryModal } from "@/components/deposits/DepositHistoryModal";
import { DepositsHeader } from "@/components/deposits/DepositsHeader";
import { DepositsTable } from "@/components/deposits/DepositsTable";
import MonthPicker from "@/components/MonthPicker";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import { useAuth } from "@/redux/hooks";
import { useDrawer } from "@/redux/hooks";
import { useMess } from "@/redux/hooks";
import { useNetwork } from "@/redux/hooks";
import {
  addDepositEntry,
  deleteDepositEntry,
  getDepositEntries,
  updateDepositEntry,
} from "@/services/depositService";
import type { DepositEntry } from "@/types/deposit";
import {
  getConsumerDepositEntries,
  getCurrentDepositDate,
  getCurrentDepositTime,
  getDepositTotal,
} from "@/utils/deposit";

const getEntryDateAndTime = (isoDate: string) => {
  const date = new Date(isoDate);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
};

export const DepositsScreen = () => {
  const insets = useSafeAreaInsets();
  const { role, token, activeMess } = useAuth();
  const { isOnline } = useNetwork();
  const { openDrawer } = useDrawer();
  const {
    consumers,
    currentYearMonth,
    addConsumer,
    removeConsumer,
    refreshMonth,
  } = useMess();
  const [entries, setEntries] = useState<DepositEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addConsumerId, setAddConsumerId] = useState<string | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [addDate, setAddDate] = useState(getCurrentDepositDate());
  const [addTime, setAddTime] = useState(getCurrentDepositTime());
  const [addNote, setAddNote] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [editingEntry, setEditingEntry] = useState<DepositEntry | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyConsumerId, setHistoryConsumerId] = useState<string | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showAddConsumer, setShowAddConsumer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addConsumerError, setAddConsumerError] = useState("");

  const isAdmin = role === "admin";
  const messId = activeMess?.id ?? null;

  const loadEntries = useCallback(async () => {
    if (!messId || !token) {
      setLoading(false);
      return;
    }
    if (!isOnline) {
      setLoading(false);
      setLoadError("You are offline. Reconnect to load deposits.");
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      setEntries(await getDepositEntries(messId, currentYearMonth, token));
    } catch (error) {
      // Preserve the last successfully loaded entries.
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load deposits. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [messId, token, currentYearMonth, isOnline]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshMonth(), loadEntries()]).catch(() => {});
    setRefreshing(false);
  }, [refreshMonth, loadEntries]);

  const openAddDeposit = (consumerId: string) => {
    setAddConsumerId(consumerId);
    setAddAmount("");
    setAddDate(getCurrentDepositDate());
    setAddTime(getCurrentDepositTime());
    setAddNote("");
    setAddError("");
    setShowAdd(true);
  };

  const handleAddDeposit = async () => {
    if (!messId || !token || !addConsumerId) return;
    const amount = Number(addAmount.trim());
    if (
      !Number.isFinite(amount) ||
      amount === 0 ||
      !/^-?\d+(?:\.\d{1,3})?$/.test(addAmount.trim())
    ) {
      setAddError(
        "Enter a non-zero amount with up to 3 decimals, e.g. 500.125 or -500.125.",
      );
      return;
    }
    const date = addDate.trim() || getCurrentDepositDate();
    const time = addTime.trim() || getCurrentDepositTime();
    const depositedAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(depositedAt.getTime())) {
      setAddError("Invalid date or time. Use YYYY-MM-DD and HH:MM.");
      return;
    }

    setAddSaving(true);
    setAddError("");
    if (!isOnline) {
      setAddError("Internet connection required.");
      setAddSaving(false);
      return;
    }
    const data = {
      messId,
      consumerId: parseInt(addConsumerId, 10),
      amount,
      depositedAt: depositedAt.toISOString(),
      note: addNote.trim() || undefined,
    };

    try {
      const entry = await addDepositEntry(data, token);
      setEntries((current) => [...current, entry]);
      setShowAdd(false);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setAddSaving(false);
    }
  };

  const openHistory = (consumerId: string) => {
    setHistoryConsumerId(consumerId);
    setShowHistory(true);
  };

  const openEditDeposit = (entry: DepositEntry) => {
    const { date, time } = getEntryDateAndTime(entry.depositedAt);
    setEditingEntry(entry);
    setAddAmount(String(entry.amount));
    setAddDate(date);
    setAddTime(time);
    setAddNote(entry.note ?? "");
    setAddError("");
  };

  const handleUpdateDeposit = async () => {
    if (!messId || !token || !editingEntry) return;
    const amount = Number(addAmount.trim());
    if (
      !Number.isFinite(amount) ||
      amount === 0 ||
      !/^-?\d+(?:\.\d{1,3})?$/.test(addAmount.trim())
    ) {
      setAddError(
        "Enter a non-zero amount with up to 3 decimals, e.g. 500.125 or -500.125.",
      );
      return;
    }
    const depositedAt = new Date(`${addDate.trim()}T${addTime.trim()}:00`);
    if (Number.isNaN(depositedAt.getTime())) {
      setAddError("Invalid date or time. Use YYYY-MM-DD and HH:MM.");
      return;
    }
    if (!isOnline) {
      setAddError("Internet connection required.");
      return;
    }

    setAddSaving(true);
    setAddError("");
    try {
      const updatedEntry = await updateDepositEntry(
        editingEntry.id,
        {
          messId,
          amount,
          depositedAt: depositedAt.toISOString(),
          note: addNote.trim() || undefined,
        },
        token,
      );
      setEntries((current) =>
        current.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry,
        ),
      );
      setEditingEntry(null);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Failed to update.");
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteEntry = (entryId: number) => {
    if (!messId || !token) return;
    if (!isOnline) {
      Alert.alert(
        "Offline",
        "Cannot delete while offline. Please try again when connected.",
      );
      return;
    }
    Alert.alert("Delete Deposit", "Remove this deposit entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(entryId);
          try {
            await deleteDepositEntry(entryId, messId, token);
            setEntries((current) =>
              current.filter((entry) => entry.id !== entryId),
            );
          } catch (error) {
            Alert.alert(
              "Error",
              error instanceof Error ? error.message : "Failed to delete.",
            );
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleAddConsumer = async () => {
    const name = newName.trim();
    const email = newEmail.trim();
    const phone = newPhone.trim() || undefined;
    setAddConsumerError("");
    if (!name) {
      setAddConsumerError("Name is required.");
      return;
    }
    if (!email) {
      setAddConsumerError("Email is required.");
      return;
    }
    if (phone && phone.length !== 11) {
      setAddConsumerError("Phone must be exactly 11 digits.");
      return;
    }
    try {
      const { invitationSent } = await addConsumer(name, email, phone);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setAddConsumerError("");
      setShowAddConsumer(false);
      if (invitationSent) {
        Alert.alert(
          "Invitation sent",
          "This person already has a Melager account and has been added to this mess. We emailed the mess key for reference.",
        );
      }
    } catch (error) {
      setAddConsumerError(
        error instanceof Error ? error.message : "Failed to add consumer.",
      );
    }
  };

  const closeAddConsumer = () => {
    setShowAddConsumer(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setAddConsumerError("");
  };

  const handleRemoveConsumer = (consumerId: string, consumerName: string) => {
    if (!isAdmin) return;
    Alert.alert("Remove Consumer", `Remove "${consumerName}" from the mess?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => removeConsumer(consumerId),
      },
    ]);
  };

  const historyConsumer = consumers.find(
    (consumer) => consumer.id === historyConsumerId,
  );
  const historyEntries = historyConsumerId
    ? getConsumerDepositEntries(entries, historyConsumerId)
        .slice()
        .sort(
          (first, second) =>
            new Date(second.depositedAt).getTime() -
            new Date(first.depositedAt).getTime(),
        )
    : [];
  return (
    <View
      className={`flex-1 bg-[#F4F8FC] ${Platform.OS === "web" ? "pt-[67px]" : "pt-safe"}`}
    >
      <StatusBar style="light" backgroundColor="#075F5B" />
      {Platform.OS !== "web" && (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-0 z-50 bg-[#075F5B]"
          style={{ height: insets.top }}
        />
      )}
      <DepositsHeader
        grandTotal={getDepositTotal(entries)}
        isAdmin={isAdmin}
        onMenu={openDrawer}
        onAddConsumer={() => setShowAddConsumer(true)}
      />
      <MonthPicker accentColor={DEPOSIT_PRIMARY} variant="dashboard" />
      {loading && (
        <View className="items-center py-3">
          <ActivityIndicator size="small" color={DEPOSIT_PRIMARY} />
        </View>
      )}
      {!loading && loadError ? (
        <View className="mx-4 my-2 flex-row items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
          <Text className="flex-1 pr-3 font-inter text-xs leading-4 text-red-700">
            {loadError}
          </Text>
          <TouchableOpacity
            className="rounded-lg bg-red-100 px-3 py-2"
            onPress={() => void loadEntries()}
            activeOpacity={0.75}
          >
            <Text className="font-inter-semibold text-xs text-red-700">
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <DepositsTable
        consumers={consumers}
        entries={entries}
        isAdmin={isAdmin}
        refreshing={refreshing}
        onRefresh={() => void handleRefresh()}
        onAddDeposit={openAddDeposit}
        onOpenHistory={openHistory}
        onRemoveConsumer={handleRemoveConsumer}
      />

      <AddDepositModal
        visible={showAdd}
        consumerName={
          consumers.find((consumer) => consumer.id === addConsumerId)?.name ??
          ""
        }
        amount={addAmount}
        date={addDate}
        time={addTime}
        note={addNote}
        error={addError}
        saving={addSaving}
        onAmountChange={setAddAmount}
        onDateChange={setAddDate}
        onTimeChange={setAddTime}
        onNoteChange={setAddNote}
        onClose={() => setShowAdd(false)}
        onSubmit={() => void handleAddDeposit()}
      />
      <AddDepositModal
        visible={editingEntry !== null}
        consumerName={
          consumers.find(
            (consumer) => consumer.id === editingEntry?.consumerId.toString(),
          )?.name ?? ""
        }
        amount={addAmount}
        date={addDate}
        time={addTime}
        note={addNote}
        error={addError}
        saving={addSaving}
        title="Edit Deposit"
        submitLabel="Save Changes"
        onAmountChange={setAddAmount}
        onDateChange={setAddDate}
        onTimeChange={setAddTime}
        onNoteChange={setAddNote}
        onClose={() => setEditingEntry(null)}
        onSubmit={() => void handleUpdateDeposit()}
      />
      <DepositHistoryModal
        visible={showHistory}
        consumerName={historyConsumer?.name ?? ""}
        entries={historyEntries}
        isAdmin={isAdmin}
        deletingId={deletingId}
        onEdit={openEditDeposit}
        onDelete={handleDeleteEntry}
        onClose={() => setShowHistory(false)}
      />
      <AddDepositConsumerModal
        visible={showAddConsumer}
        name={newName}
        email={newEmail}
        phone={newPhone}
        error={addConsumerError}
        onNameChange={setNewName}
        onEmailChange={setNewEmail}
        onPhoneChange={setNewPhone}
        onClose={closeAddConsumer}
        onSubmit={() => void handleAddConsumer()}
      />
    </View>
  );
};
