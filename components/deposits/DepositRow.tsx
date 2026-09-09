import Feather from "@expo/vector-icons/Feather";
import { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { DepositEntry } from "@/types/deposit";
import type { Consumer } from "@/types/mess";
import { formatDepositAmount } from "@/utils/deposit";

interface DepositRowProps {
  consumer: Consumer;
  index: number;
  entries: DepositEntry[];
  total: number;
  isAdmin: boolean;
  onOpenConsumer: (consumer: Consumer) => void;
  onRemove: (consumerId: string, consumerName: string) => void;
  onOpenHistory: (consumerId: string) => void;
  onAdd: (consumerId: string) => void;
}

/**
 * One member's row in the deposits table.
 *
 * Split out of `DepositsTable` so opening a modal — which only changes that
 * table's own state — no longer rebuilds every row. The entry array's identity
 * is enough for the comparator: the table groups the month's entries once, so
 * a member whose deposits did not change keeps the same array.
 */
export const DepositRow = memo(
  ({
    consumer,
    index,
    entries,
    total,
    isAdmin,
    onOpenConsumer,
    onRemove,
    onOpenHistory,
    onAdd,
  }: DepositRowProps) => (
    <View
      className={`min-h-[52px] flex-row border-b border-slate-200 ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
    >
      <TouchableOpacity
        className="w-[120px] justify-center border-r border-slate-200"
        onPress={() => onOpenConsumer(consumer)}
        onLongPress={
          isAdmin ? () => onRemove(consumer.id, consumer.name) : undefined
        }
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`View deposits for ${consumer.name}`}
      >
        <Text
          className="px-2.5 py-2 font-inter-medium text-[13px] text-slate-900"
          numberOfLines={2}
        >
          {consumer.name}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="w-[118px] justify-center border-r border-slate-200 px-2.5"
        onPress={() =>
          entries.length > 0 ? onOpenHistory(consumer.id) : undefined
        }
        activeOpacity={entries.length > 0 ? 0.7 : 1}
      >
        <Text
          className={`text-right font-inter-semibold text-[13px] ${total > 0 ? "text-teal-700" : total < 0 ? "text-red-600" : "text-slate-500"}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          ৳{formatDepositAmount(total)}
        </Text>
      </TouchableOpacity>

      <View className="min-h-[52px] flex-1 flex-row items-center px-2 py-1.5">
        <TouchableOpacity
          className="min-h-9 flex-1 flex-row flex-wrap items-center pr-1"
          onPress={() =>
            entries.length > 0 ? onOpenHistory(consumer.id) : undefined
          }
          activeOpacity={entries.length > 0 ? 0.7 : 1}
        >
          {entries.length === 0 ? (
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
              {entries.map((entry) => (
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
            onPress={() => onAdd(consumer.id)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  ),
  (previous, next) =>
    previous.consumer.id === next.consumer.id &&
    previous.consumer.name === next.consumer.name &&
    previous.index === next.index &&
    previous.entries === next.entries &&
    previous.total === next.total &&
    previous.isAdmin === next.isAdmin &&
    previous.onOpenConsumer === next.onOpenConsumer &&
    previous.onRemove === next.onRemove &&
    previous.onOpenHistory === next.onOpenHistory &&
    previous.onAdd === next.onAdd,
);

DepositRow.displayName = "DepositRow";
