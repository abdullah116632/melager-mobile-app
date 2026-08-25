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
import { useAuth, useMess } from "@/redux/hooks";
import type { DepositEntry } from "@/types/deposit";
import {
  formatDepositAmount,
  getConsumerDepositEntries,
  getDepositTotal,
} from "@/utils/deposit";
import { AddDepositModal } from "./AddDepositModal";
import { DepositHistoryModal } from "./DepositHistoryModal";

interface DepositsTableProps {
  entries: DepositEntry[];
  onRefresh: () => Promise<void>;
  onEntryAdded: (entry: DepositEntry) => void;
  onEntryUpdated: (entry: DepositEntry) => void;
  onEntryDeleted: (entryId: number) => void;
}

export const DepositsTable = ({
  entries,
  onRefresh,
  onEntryAdded,
  onEntryUpdated,
  onEntryDeleted,
}: DepositsTableProps) => {
  const { role } = useAuth();
  const { consumers, removeConsumer } = useMess();
  const [refreshing, setRefreshing] = useState(false);
  const [addingConsumerId, setAddingConsumerId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<DepositEntry | null>(null);
  const [historyConsumerId, setHistoryConsumerId] = useState<string | null>(
    null,
  );
  const isAdmin = role === "admin";
  const grandTotal = getDepositTotal(entries);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const remove = (consumerId: string, consumerName: string) => {
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

  return (
    <>
      {consumers.length === 0 ? (
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
                Consumers ({consumers.length})
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
            {consumers.map((consumer, index) => {
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
                        <Text className="font-inter text-xs italic text-slate-500">
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
                <Text className="text-right font-inter-bold text-[13px] text-white">
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
        onSaved={(entry) => {
          onEntryAdded(entry);
          setAddingConsumerId(null);
        }}
      />
      <AddDepositModal
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSaved={(entry) => {
          onEntryUpdated(entry);
          setEditingEntry(null);
        }}
      />
      <DepositHistoryModal
        consumerId={historyConsumerId}
        entries={entries}
        onEdit={setEditingEntry}
        onDeleted={onEntryDeleted}
        onClose={() => setHistoryConsumerId(null)}
      />
    </>
  );
};
