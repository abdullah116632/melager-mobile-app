import Feather from "@expo/vector-icons/Feather";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  mergeExpenseItems,
  sameExpenseItem,
  sameExpenseItems,
  type ExpenseConflict,
} from "@/offline/features/expenses/conflicts";
import type { DayExpenseItem } from "@/types/mess";
import { formatExpenseAmount } from "@/utils/expense";

export type ExpenseResolution = "local" | "server" | "both";

export const expenseConflictKey = (conflict: ExpenseConflict) =>
  `${conflict.yearMonth}:${conflict.day}`;

const formatConflictDate = (yearMonth: string, day: number): string =>
  new Date(
    `${yearMonth}-${String(day).padStart(2, "0")}T00:00:00`,
  ).toLocaleDateString("en-US", { day: "numeric", month: "short" });

const total = (items: DayExpenseItem[]) =>
  items.reduce((sum, item) => sum + Number(item.amount), 0);

const money = (amount: number) => `৳${formatExpenseAmount(amount) || "0"}`;

const ItemList = ({
  label,
  items,
  otherItems,
  tone,
}: {
  label: string;
  items: DayExpenseItem[];
  otherItems: DayExpenseItem[];
  tone: "local" | "server";
}) => {
  const otherById = new Map(otherItems.map((item) => [String(item.id), item]));
  const local = tone === "local";
  return (
    <View
      className={`rounded-xl border px-3 py-2.5 ${
        local ? "border-teal-200 bg-teal-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text
          className={`font-inter-medium text-[10px] uppercase tracking-wide ${
            local ? "text-teal-700" : "text-slate-500"
          }`}
        >
          {label}
        </Text>
        <Text
          className={`font-inter-bold text-[13px] ${
            local ? "text-teal-800" : "text-slate-800"
          }`}
        >
          {money(total(items))}
        </Text>
      </View>
      {items.length === 0 ? (
        <Text className="font-inter text-[12px] text-slate-400">No items</Text>
      ) : (
        items.map((item) => {
          const other = otherById.get(String(item.id));
          const tag = !other
            ? "new"
            : sameExpenseItem(item, other)
              ? null
              : "edited";
          return (
            <View
              key={String(item.id)}
              className="flex-row items-center gap-2 py-0.5"
            >
              <Text
                className="min-w-0 flex-1 font-inter text-[12px] text-slate-700"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {tag ? (
                <View
                  className={`rounded px-1.5 py-px ${
                    local ? "bg-teal-100" : "bg-slate-200"
                  }`}
                >
                  <Text
                    className={`font-inter-semibold text-[9px] uppercase ${
                      local ? "text-teal-800" : "text-slate-600"
                    }`}
                  >
                    {tag}
                  </Text>
                </View>
              ) : null}
              <Text className="font-inter-semibold text-[12px] text-slate-800">
                {money(Number(item.amount))}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
};

interface ExpenseConflictModalProps {
  conflicts: ExpenseConflict[];
  resolvingKey: string | null;
  onResolve: (conflict: ExpenseConflict, resolution: ExpenseResolution) => void;
}

export const ExpenseConflictModal = ({
  conflicts,
  resolvingKey,
  onResolve,
}: ExpenseConflictModalProps) => {
  const insets = useSafeAreaInsets();
  const visible = conflicts.length > 0;
  // Keep the last entries on screen while the sheet slides away, instead of
  // animating out an empty sheet.
  const [shown, setShown] = useState(conflicts);
  useEffect(() => {
    if (conflicts.length > 0) setShown(conflicts);
  }, [conflicts]);
  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      // A decision is required: the back button must not dismiss it either.
      onRequestClose={() => undefined}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View
          className="rounded-t-3xl bg-white"
          style={{
            maxHeight: "88%",
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View className="border-b border-slate-100 px-5 pb-4 pt-5">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Feather name="alert-triangle" size={19} color="#B45309" />
              </View>
              <View className="min-w-0 flex-1">
                <View className="mb-1 flex-row items-center gap-1 self-start rounded-full bg-teal-50 px-2 py-0.5">
                  <Feather name="shopping-bag" size={10} color="#0F766E" />
                  <Text className="font-inter-semibold text-[10px] uppercase tracking-wide text-teal-700">
                    Expenses page · Daily expenses
                  </Text>
                </View>
                <Text className="font-inter-bold text-[16px] text-slate-900">
                  Expense conflict
                </Text>
              </View>
              <View className="rounded-full bg-amber-100 px-2.5 py-1">
                <Text className="font-inter-semibold text-[11px] text-amber-800">
                  {shown.length} left
                </Text>
              </View>
            </View>
            <Text className="mt-3 font-inter text-[12px] leading-[18px] text-slate-600">
              This phone and another admin&apos;s device both changed the
              expense list for the same day on the Expenses page, so your change
              has not been saved to the server yet.
            </Text>
            <View className="mt-3 gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
              <Text className="font-inter-semibold text-[11px] text-slate-700">
                For each day, choose one:
              </Text>
              <View className="flex-row items-start gap-2">
                <Feather
                  name="smartphone"
                  size={12}
                  color="#0F766E"
                  style={{ marginTop: 2 }}
                />
                <Text className="flex-1 font-inter text-[11px] leading-4 text-slate-600">
                  <Text className="font-inter-semibold text-teal-700">
                    Keep mine
                  </Text>{" "}
                  — use the list from this phone.
                </Text>
              </View>
              <View className="flex-row items-start gap-2">
                <Feather
                  name="cloud"
                  size={12}
                  color="#334155"
                  style={{ marginTop: 2 }}
                />
                <Text className="flex-1 font-inter text-[11px] leading-4 text-slate-600">
                  <Text className="font-inter-semibold text-slate-800">
                    Use server
                  </Text>{" "}
                  — keep the list the other admin saved.
                </Text>
              </View>
              <View className="flex-row items-start gap-2">
                <Feather
                  name="layers"
                  size={12}
                  color="#0F766E"
                  style={{ marginTop: 2 }}
                />
                <Text className="flex-1 font-inter text-[11px] leading-4 text-slate-600">
                  <Text className="font-inter-semibold text-teal-700">
                    Keep both
                  </Text>{" "}
                  — keep every item from both lists, when they can be combined.
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ padding: 12, gap: 10 }}
            showsVerticalScrollIndicator
          >
            {shown.map((conflict) => {
              const key = expenseConflictKey(conflict);
              const resolving = resolvingKey === key;
              const busy = resolvingKey !== null;
              const merged = mergeExpenseItems(
                conflict.serverItems,
                conflict.localItems,
              );
              const canMerge =
                !sameExpenseItems(merged, conflict.localItems) &&
                !sameExpenseItems(merged, conflict.serverItems);

              return (
                <View
                  key={key}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5"
                >
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <Feather name="calendar" size={15} color="#475569" />
                    </View>
                    <Text className="min-w-0 flex-1 font-inter-semibold text-[14px] text-slate-800">
                      {formatConflictDate(conflict.yearMonth, conflict.day)}
                    </Text>
                    <View className="rounded-full bg-amber-50 px-2.5 py-1">
                      <Text className="font-inter-semibold text-[11px] text-amber-800">
                        Changed on both devices
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 gap-2">
                    <ItemList
                      label="This device"
                      tone="local"
                      items={conflict.localItems}
                      otherItems={conflict.serverItems}
                    />
                    <ItemList
                      label="Server"
                      tone="server"
                      items={conflict.serverItems}
                      otherItems={conflict.localItems}
                    />
                  </View>

                  {resolving ? (
                    <View className="mt-3 h-11 flex-row items-center justify-center gap-2 rounded-xl bg-slate-50">
                      <ActivityIndicator size="small" color="#0F766E" />
                      <Text className="font-inter-medium text-xs text-slate-600">
                        Saving…
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-3 gap-2">
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-teal-700 ${
                            busy ? "opacity-50" : ""
                          }`}
                          disabled={busy}
                          activeOpacity={0.8}
                          onPress={() => onResolve(conflict, "local")}
                          accessibilityRole="button"
                          accessibilityLabel={`Keep this phone's list, ${money(total(conflict.localItems))}`}
                        >
                          <Feather
                            name="smartphone"
                            size={14}
                            color="#FFFFFF"
                          />
                          <Text
                            className="font-inter-semibold text-xs text-white"
                            numberOfLines={1}
                          >
                            Keep mine · {money(total(conflict.localItems))}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white ${
                            busy ? "opacity-50" : ""
                          }`}
                          disabled={busy}
                          activeOpacity={0.8}
                          onPress={() => onResolve(conflict, "server")}
                          accessibilityRole="button"
                          accessibilityLabel={`Use the server's list, ${money(total(conflict.serverItems))}`}
                        >
                          <Feather name="cloud" size={14} color="#334155" />
                          <Text
                            className="font-inter-semibold text-xs text-slate-700"
                            numberOfLines={1}
                          >
                            Use server · {money(total(conflict.serverItems))}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {canMerge ? (
                        <TouchableOpacity
                          className={`h-11 flex-row items-center justify-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 ${
                            busy ? "opacity-50" : ""
                          }`}
                          disabled={busy}
                          activeOpacity={0.8}
                          onPress={() => onResolve(conflict, "both")}
                          accessibilityRole="button"
                          accessibilityLabel={`Keep every item from both lists, ${money(total(merged))}`}
                        >
                          <Feather name="layers" size={14} color="#0F766E" />
                          <Text className="font-inter-semibold text-xs text-teal-800">
                            Keep both · {merged.length} items ·{" "}
                            {money(total(merged))}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center justify-center gap-1.5 border-t border-slate-100 px-5 pt-3">
            <Feather name="lock" size={11} color="#94A3B8" />
            <Text className="font-inter text-[11px] text-slate-500">
              Closes once every day is resolved
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};
