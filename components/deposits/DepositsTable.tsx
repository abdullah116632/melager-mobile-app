import Feather from "@expo/vector-icons/Feather";
import {
  RefreshControl,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DEPOSIT_PRIMARY } from "@/constants/deposit";
import type { DepositConsumer, DepositEntry } from "@/types/deposit";
import {
  formatDepositAmount,
  getConsumerDepositEntries,
  getDepositTotal,
} from "@/utils/deposit";

interface DepositsTableProps {
  consumers: DepositConsumer[];
  entries: DepositEntry[];
  isAdmin: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onAddDeposit: (consumerId: string) => void;
  onOpenHistory: (consumerId: string) => void;
  onRemoveConsumer: (consumerId: string, consumerName: string) => void;
}

export const DepositsTable = ({
  consumers,
  entries,
  isAdmin,
  refreshing,
  onRefresh,
  onAddDeposit,
  onOpenHistory,
  onRemoveConsumer,
}: DepositsTableProps) => {
  const grandTotal = getDepositTotal(entries);

  if (consumers.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-3 pb-20">
        <Feather name="users" size={48} color="#64748B" />
        <Text className="font-inter-bold text-lg text-slate-900">
          No consumers yet
        </Text>
        <Text className="px-8 text-center font-inter text-sm text-slate-500">
          Add consumers from the Meals tab or tap + above
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="h-[38px] flex-row items-center border-b border-slate-200 bg-[#0A5954]">
        <View className="w-[120px] justify-center border-r border-white/20">
          <Text className="px-2.5 font-inter-semibold text-xs text-white">
            Consumers ({consumers.length})
          </Text>
        </View>
        <View className="w-[82px] justify-center border-r px-2.5">
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
            onRefresh={onRefresh}
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
                onLongPress={() => onRemoveConsumer(consumer.id, consumer.name)}
                activeOpacity={0.7}
              >
                <Text
                  className="px-2.5 py-2 font-inter-medium text-[13px] text-slate-900"
                  numberOfLines={2}
                >
                  {consumer.name}
                </Text>
              </TouchableOpacity>

              <View className="w-[82px] justify-center border-r border-slate-200 px-2.5">
                <Text
                  className={`text-right font-inter-semibold text-[13px] ${total > 0 ? "text-teal-700" : "text-slate-500"}`}
                >
                  ৳{formatDepositAmount(total)}
                </Text>
              </View>

              <View className="min-h-[52px] flex-1 flex-row items-center px-2 py-1.5">
                <TouchableOpacity
                  className="min-h-9 flex-1 flex-row flex-wrap items-center pr-1"
                  onPress={() =>
                    consumerEntries.length > 0
                      ? onOpenHistory(consumer.id)
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
                    onPress={() => onAddDeposit(consumer.id)}
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
          <View className="w-[82px] justify-center border-r px-2.5">
            <Text className="text-right font-inter-bold text-[13px] text-white">
              ৳{formatDepositAmount(grandTotal)}
            </Text>
          </View>
          <View className="h-full flex-1 flex-row items-center px-2" />
        </View>
      </ScrollView>
    </View>
  );
};
