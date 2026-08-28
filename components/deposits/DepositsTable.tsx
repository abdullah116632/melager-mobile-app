import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
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
import {
  formatDepositAmount,
  getConsumerDepositEntries,
  getDepositTotal,
} from "@/utils/deposit";
import { AddDepositModal } from "./AddDepositModal";
import { DepositHistoryModal } from "./DepositHistoryModal";

interface DepositsTableProps {
  onRefresh: () => Promise<void>;
}

const DEPOSIT_PLACEHOLDER_ROWS = Array.from({ length: 8 }, (_, index) => index);

export const DepositsTable = ({ onRefresh }: DepositsTableProps) => {
  const { role } = useAuth();
  const { consumers, entries, entriesReady, removeConsumer } = useDeposits();
  const [refreshing, setRefreshing] = useState(false);
  const [addingConsumerId, setAddingConsumerId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<DepositEntry | null>(null);
  const [historyConsumerId, setHistoryConsumerId] = useState<string | null>(
    null,
  );
  const [pendingRemoval, setPendingRemoval] =
    useState<PendingMemberRemoval | null>(null);
  const [removing, setRemoving] = useState(false);
  const isAdmin = role === "admin";
  const ready = entriesReady;
  const grandTotal = ready ? getDepositTotal(entries) : 0;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const remove = (consumerId: string, consumerName: string) => {
    if (!isAdmin || !ready) return;
    setPendingRemoval({ id: consumerId, name: consumerName });
  };

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
      {ready && consumers.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 pb-20">
          <Feather name="users" size={48} color="#64748B" />
          <Text className="font-inter-bold text-lg text-slate-900">
            No consumers yet
          </Text>
          <Text className="px-8 text-center font-inter text-sm text-slate-500">
            Add consumers from the Meals tab or tap + above
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <View className="h-[38px] flex-row items-center border-b border-slate-200 bg-[#0A5954]">
            <View className="w-[120px] justify-center border-r border-white/20">
              <Text className="px-2.5 font-inter-semibold text-xs text-white">
                Consumers{ready ? ` (${consumers.length})` : ""}
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
              consumers.map((consumer, index) => {
                const consumerEntries = getConsumerDepositEntries(
                  entries,
                  consumer.id,
                );
                const total = getDepositTotal(consumerEntries);
                return (
                  <View
                    key={consumer.id}
                    className={`min-h-[52px] flex-row border-b border-slate-200 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                  >
                    <TouchableOpacity
                      className="w-[120px] justify-center border-r border-slate-200"
                      onLongPress={() => remove(consumer.id, consumer.name)}
                      activeOpacity={0.7}
                    >
                      <Text
                        className="px-2.5 py-2 font-inter-medium text-[13px] text-slate-900"
                        numberOfLines={2}
                      >
                        {consumer.name}
                      </Text>
                    </TouchableOpacity>

                    <View className="w-[118px] justify-center border-r border-slate-200 px-2.5">
                      <Text
                        className={`text-right font-inter-semibold text-[13px] ${total > 0 ? "text-teal-700" : total < 0 ? "text-red-600" : "text-slate-500"}`}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        ৳{formatDepositAmount(total)}
                      </Text>
                    </View>

                    <View className="min-h-[52px] flex-1 flex-row items-center px-2 py-1.5">
                      <TouchableOpacity
                        className="min-h-9 flex-1 flex-row flex-wrap items-center pr-1"
                        onPress={() =>
                          consumerEntries.length > 0
                            ? setHistoryConsumerId(consumer.id)
                            : undefined
                        }
                        activeOpacity={consumerEntries.length > 0 ? 0.7 : 1}
                      >
                        {consumerEntries.length === 0 ? (
                          <Text
                            className="font-inter text-xs italic text-slate-500"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                          >
                            No deposits
                          </Text>
                        ) : (
                          <View className="flex-row flex-wrap items-center gap-[5px]">
                            {consumerEntries.map((entry) => (
                              <View
                                key={entry.id}
                                className="h-2.5 w-2.5 rounded-full bg-teal-500"
                              />
                            ))}
                          </View>
                        )}
                      </TouchableOpacity>
                      {isAdmin && (
                        <TouchableOpacity
                          className="ml-1.5 h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white/80 bg-teal-700"
                          onPress={() => setAddingConsumerId(consumer.id)}
                          activeOpacity={0.8}
                        >
                          <Feather name="plus" size={18} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

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
      <RemoveMemberConfirmModal
        member={pendingRemoval}
        loading={removing}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => void confirmRemoval()}
      />
    </>
  );
};
