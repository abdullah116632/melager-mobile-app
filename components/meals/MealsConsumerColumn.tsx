import { useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import {
  RemoveMemberConfirmModal,
  type PendingMemberRemoval,
} from "@/components/RemoveMemberConfirmModal";
import { useAuth } from "@/redux/hooks";
import { useMeals } from "@/redux/hooks";
import type { Consumer } from "@/types/mess";
import { MealConsumerDetailModal } from "./MealConsumerDetailModal";

const CONSUMER_ACCENTS = [
  "#059669",
  "#0284C7",
  "#7C3AED",
  "#EA580C",
  "#DB2777",
  "#CA8A04",
] as const;

const getConsumerNameColor = (consumerId: string) => {
  const hash = Array.from(consumerId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return CONSUMER_ACCENTS[hash % CONSUMER_ACCENTS.length];
};

interface MealsConsumerColumnProps {
  loading?: boolean;
  placeholderCount?: number;
  /**
   * Rows the grid is currently rendering. The names must line up with those
   * rows, so this column skips the same off-screen rows and replaces them with
   * spacers of exactly the height they would have occupied.
   */
  rowStart?: number;
  rowEnd?: number;
}

const ROW_H = 52;

export const MealsConsumerColumn = ({
  loading = false,
  placeholderCount = 8,
  rowStart,
  rowEnd,
}: MealsConsumerColumnProps) => {
  const { role } = useAuth();
  const {
    consumers,
    currentYearMonth,
    currentMonthLabel,
    getConsumerTotal,
    removeConsumer,
  } = useMeals();
  const isAdmin = role === "admin";
  const [selectedConsumer, setSelectedConsumer] = useState<Consumer | null>(
    null,
  );
  const [pendingRemoval, setPendingRemoval] =
    useState<PendingMemberRemoval | null>(null);
  const [removing, setRemoving] = useState(false);

  const removeSelectedConsumer = (consumerId: string, consumerName: string) => {
    if (!isAdmin) return;
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

  const rowCount = loading ? placeholderCount : consumers.length;
  const start = Math.min(Math.max(0, rowStart ?? 0), rowCount);
  const end = Math.min(Math.max(start, rowEnd ?? rowCount), rowCount);
  const leadingHeight = start * ROW_H;
  const trailingHeight = (rowCount - end) * ROW_H;
  const placeholderRows = Array.from(
    { length: end - start },
    (_, offset) => start + offset,
  );
  const visibleConsumers = consumers
    .slice(start, end)
    .map((consumer, offset) => ({ consumer, index: start + offset }));

  return (
    <>
      <View
        pointerEvents="box-none"
        className="absolute left-0 top-0 z-30 w-[110px] shadow-md shadow-black/10"
      >
        {leadingHeight > 0 ? <View style={{ height: leadingHeight }} /> : null}
        {loading
          ? placeholderRows.map((index) => (
              <View
                key={index}
                className={`h-[52px] w-[110px] justify-center border-b-[0.5px] border-r border-slate-200 px-3 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"
                }`}
              >
                <View className="h-2.5 w-16 rounded-full bg-slate-200" />
              </View>
            ))
          : visibleConsumers.map(({ consumer, index }) => (
              <TouchableOpacity
                key={consumer.id}
                className={`h-[52px] w-[110px] flex-row items-center overflow-hidden border-b-[0.5px] border-r border-slate-200 px-3 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#FAFCFD]"
                }`}
                onPress={() => setSelectedConsumer(consumer)}
                onLongPress={
                  isAdmin
                    ? () => removeSelectedConsumer(consumer.id, consumer.name)
                    : undefined
                }
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`View meal details for ${consumer.name}`}
              >
                <Text
                  className="flex-1 font-inter-semibold text-[13px] leading-4"
                  style={{ color: getConsumerNameColor(consumer.id) }}
                  numberOfLines={2}
                >
                  {consumer.name}
                </Text>
              </TouchableOpacity>
            ))}
        {trailingHeight > 0 ? (
          <View style={{ height: trailingHeight }} />
        ) : null}
        <View className="h-[52px] w-[110px] items-center justify-center border-r border-white/20 bg-[#08766E]">
          <Text className="font-inter-bold text-xs text-white">Total</Text>
        </View>
      </View>
      <RemoveMemberConfirmModal
        member={pendingRemoval}
        loading={removing}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => void confirmRemoval()}
      />
      <MealConsumerDetailModal
        consumer={selectedConsumer}
        monthLabel={currentMonthLabel}
        totalMeals={
          selectedConsumer
            ? getConsumerTotal(currentYearMonth, selectedConsumer.id)
            : 0
        }
        onClose={() => setSelectedConsumer(null)}
      />
    </>
  );
};
