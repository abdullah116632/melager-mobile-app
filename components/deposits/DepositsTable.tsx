import Feather from "@expo/vector-icons/Feather";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import {
  RemoveMemberConfirmModal,
  type PendingMemberRemoval,
} from "@/components/RemoveMemberConfirmModal";
import { useAuth, useDeposits } from "@/redux/hooks";
import type { DepositEntry } from "@/types/deposit";
import type { Consumer } from "@/types/mess";
import { formatDepositAmount } from "@/utils/deposit";
import { AddDepositModal } from "./AddDepositModal";
import { DepositRow } from "./DepositRow";
import { DepositConsumerDetailModal } from "./DepositConsumerDetailModal";
import { DepositHistoryModal } from "./DepositHistoryModal";

interface DepositsTableProps {
  onRefresh: () => Promise<void>;
}

const DEPOSIT_PLACEHOLDER_ROWS = Array.from({ length: 8 }, (_, index) => index);

/** Shared so a member with no deposits keeps the same array between renders. */
const NO_CONSUMER_ENTRIES: DepositEntry[] = [];

export const DepositsTable = ({ onRefresh }: DepositsTableProps) => {
  const { role } = useAuth();
  const {
    consumers,
    currentMonthLabel,
    entries,
    entriesReady,
    removeConsumer,
  } = useDeposits();
  const [refreshing, setRefreshing] = useState(false);
  const [addingConsumerId, setAddingConsumerId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<DepositEntry | null>(null);
  const [selectedConsumer, setSelectedConsumer] = useState<Consumer | null>(
    null,
  );
  const [historyConsumerId, setHistoryConsumerId] = useState<string | null>(
    null,
  );
  const [pendingRemoval, setPendingRemoval] =
    useState<PendingMemberRemoval | null>(null);
  const [removing, setRemoving] = useState(false);
  const isAdmin = role === "admin";
  const ready = entriesReady;
  // Every row used to filter the whole month's entries for its own member,
  // which is O(members x entries) per render and allocated an array per row.
  // One grouping pass gives each row a stable array to memoise on.
  const { entriesByConsumer, totalsByConsumer, entriesTotal } = useMemo(() => {
    const byConsumer = new Map<string, DepositEntry[]>();
    const totals = new Map<string, number>();
    let sum = 0;
    for (const entry of entries) {
      const key = entry.consumerId.toString();
      const list = byConsumer.get(key);
      if (list) list.push(entry);
      else byConsumer.set(key, [entry]);
      totals.set(key, (totals.get(key) ?? 0) + entry.amount);
      sum += entry.amount;
    }
    return {
      entriesByConsumer: byConsumer,
      totalsByConsumer: totals,
      entriesTotal: sum,
    };
  }, [entries]);
  const grandTotal = ready ? entriesTotal : 0;
  // A consumer row's serial id is assigned when that person joins the mess.
  // Do not rely on the incidental order returned by SQLite, a cache, or an
  // API query: that made rows jump around after a refresh. Temporary offline
  // consumers are always kept after confirmed members, in creation order.
  const orderedConsumers = useMemo(
    () =>
      [...consumers].sort((left, right) => {
        const leftId = Number(left.id);
        const rightId = Number(right.id);
        const leftConfirmed = leftId > 0;
        const rightConfirmed = rightId > 0;
        if (leftConfirmed && rightConfirmed) return leftId - rightId;
        if (leftConfirmed) return -1;
        if (rightConfirmed) return 1;
        return rightId - leftId;
      }),
    [consumers],
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Stable so a row only re-renders when its own member's deposits change.
  const remove = useCallback(
    (consumerId: string, consumerName: string) => {
      if (!isAdmin || !ready) return;
      setPendingRemoval({ id: consumerId, name: consumerName });
    },
    [isAdmin, ready],
  );

  const openConsumer = useCallback(
    (consumer: Consumer) => setSelectedConsumer(consumer),
    [],
  );
  const openHistory = useCallback(
    (consumerId: string) => setHistoryConsumerId(consumerId),
    [],
  );
  const openAdd = useCallback(
    (consumerId: string) => setAddingConsumerId(consumerId),
    [],
  );

  const confirmRemoval = async () => {
    if (!pendingRemoval || removing) return;
    setRemoving(true);
    try {
      await removeConsumer(pendingRemoval.id);
      setPendingRemoval(null);
    } catch (caughtError) {
      Alert.alert(
        "Remove failed",
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to remove member.",
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      {ready && orderedConsumers.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 pb-20">
          <Feather name="users" size={48} color="#64748B" />
          <Text className="font-inter-bold text-lg text-slate-900">
            No members yet
          </Text>
          <Text className="px-8 text-center font-inter text-sm text-slate-500">
            Add members from the Meals tab or tap + above
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <View className="h-[38px] flex-row items-center border-b border-slate-200 bg-[#0A5954]">
            <View className="w-[120px] justify-center border-r border-white/20">
              <Text className="px-2.5 font-inter-semibold text-xs text-white">
                Members{ready ? ` (${orderedConsumers.length})` : ""}
              </Text>
            </View>
            <View className="w-[118px] justify-center border-r px-2.5">
              <Text className="px-2.5 font-inter-semibold text-xs text-white">
                Total
              </Text>
            </View>
            <View className="h-full flex-1 flex-row items-center px-2">
              <Text className="px-2.5 font-inter-semibold text-xs text-white">
                Deposits
              </Text>
            </View>
          </View>

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === "android"}
            contentContainerClassName={
              Platform.OS === "web" ? "pb-[118px]" : "pb-safe-offset-[49px]"
            }
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void refresh()}
                tintColor={DEPOSIT_PRIMARY}
                colors={[DEPOSIT_PRIMARY]}
              />
            }
          >
            {!ready &&
              DEPOSIT_PLACEHOLDER_ROWS.map((row) => (
                <View
                  key={row}
                  className={`min-h-[52px] flex-row border-b border-slate-200 ${row % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                >
                  <View className="w-[120px] justify-center border-r border-slate-200 px-2.5">
                    <View className="h-2.5 w-16 rounded-full bg-slate-200" />
                  </View>
                  <View className="w-[118px] justify-center border-r border-slate-200 px-2.5">
                    <Text className="text-right font-inter-semibold text-[13px] text-slate-300">
                      ৳0
                    </Text>
                  </View>
                  <View className="min-h-[52px] flex-1 flex-row items-center px-2 py-1.5">
                    <View className="h-2.5 w-20 rounded-full bg-slate-200" />
                    {isAdmin && (
                      <View className="ml-auto h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white/80 bg-teal-700 opacity-40">
                        <Feather name="plus" size={18} color="#fff" />
                      </View>
                    )}
                  </View>
                </View>
              ))}

            {ready &&
              orderedConsumers.map((consumer, index) => (
                <DepositRow
                  key={consumer.id}
                  consumer={consumer}
                  index={index}
                  entries={
                    entriesByConsumer.get(consumer.id) ?? NO_CONSUMER_ENTRIES
                  }
                  total={totalsByConsumer.get(consumer.id) ?? 0}
                  isAdmin={isAdmin}
                  onOpenConsumer={openConsumer}
                  onRemove={remove}
                  onOpenHistory={openHistory}
                  onAdd={openAdd}
                />
              ))}

            <View className="h-[50px] flex-row items-center bg-[#0A5954]">
              <View className="w-[120px] justify-center border-r border-white/20">
                <Text className="px-2.5 font-inter-bold text-[13px] text-white">
                  Total
                </Text>
              </View>
              <View className="w-[118px] justify-center border-r px-2.5">
                <Text
                  className="text-right font-inter-bold text-[13px] text-white"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  ৳{formatDepositAmount(grandTotal)}
                </Text>
              </View>
              <View className="h-full flex-1 flex-row items-center px-2" />
            </View>
          </ScrollView>
        </View>
      )}
      <AddDepositModal
        consumerId={addingConsumerId}
        onClose={() => setAddingConsumerId(null)}
      />
      <AddDepositModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
      />
      <DepositHistoryModal
        consumerId={historyConsumerId}
        onEdit={setEditingEntry}
        onClose={() => setHistoryConsumerId(null)}
      />
      <DepositConsumerDetailModal
        consumer={selectedConsumer}
        monthLabel={currentMonthLabel}
        totalDeposits={
          selectedConsumer
            ? (totalsByConsumer.get(selectedConsumer.id) ?? 0)
            : 0
        }
        onClose={() => setSelectedConsumer(null)}
      />
      <RemoveMemberConfirmModal
        member={pendingRemoval}
        loading={removing}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => void confirmRemoval()}
      />
    </>
  );
};
