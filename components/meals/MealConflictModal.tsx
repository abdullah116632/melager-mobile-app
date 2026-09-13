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
import type { DailyMealConflict } from "@/offline/features/dailyMeals/DailyMealsRepository";
import { formatDashboardQuantity } from "@/utils/dashboard";

const formatConflictDate = (yearMonth: string, day: number): string =>
  new Date(
    `${yearMonth}-${String(day).padStart(2, "0")}T00:00:00`,
  ).toLocaleDateString("en-US", { day: "numeric", month: "short" });

interface MealConflictModalProps {
  conflicts: DailyMealConflict[];
  consumers: Array<{ id: string; name: string }>;
  resolvingKey: string | null;
  onResolve: (
    conflict: DailyMealConflict,
    resolution: "local" | "server",
  ) => void;
}

export const MealConflictModal = ({
  conflicts,
  consumers,
  resolvingKey,
  onResolve,
}: MealConflictModalProps) => {
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
                  <Feather name="grid" size={10} color="#0F766E" />
                  <Text className="font-inter-semibold text-[10px] uppercase tracking-wide text-teal-700">
                    Meals page · Meal entries
                  </Text>
                </View>
                <Text className="font-inter-bold text-[16px] text-slate-900">
                  Meal entry conflict
                </Text>
              </View>
              <View className="rounded-full bg-amber-100 px-2.5 py-1">
                <Text className="font-inter-semibold text-[11px] text-amber-800">
                  {shown.length} left
                </Text>
              </View>
            </View>
            <Text className="mt-3 font-inter text-[12px] leading-[18px] text-slate-600">
              This phone and another admin&apos;s device both changed the same
              meal entries on the Meals page, so your change has not been saved
              to the server yet.
            </Text>
            <View className="mt-3 gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
              <Text className="font-inter-semibold text-[11px] text-slate-700">
                For each entry, choose one:
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
                  — save the value you entered on this phone.
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
                  — keep the value the other admin saved.
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
              const key = `${conflict.consumerId}:${conflict.day}`;
              const name =
                consumers.find(
                  (consumer) => consumer.id === conflict.consumerId,
                )?.name ?? `Consumer ${conflict.consumerId}`;
              const resolving = resolvingKey === key;
              const busy = resolvingKey !== null;
              const localValue = formatDashboardQuantity(conflict.localCount);
              const serverValue = formatDashboardQuantity(conflict.serverCount);

              return (
                <View
                  key={`${conflict.yearMonth}:${key}`}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5"
                >
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      <Text className="font-inter-bold text-[13px] text-slate-600">
                        {name.trim().charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                    <Text
                      className="min-w-0 flex-1 font-inter-semibold text-[14px] text-slate-800"
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    <View className="flex-row items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                      <Feather name="calendar" size={11} color="#64748B" />
                      <Text className="font-inter-medium text-[11px] text-slate-600">
                        {formatConflictDate(conflict.yearMonth, conflict.day)}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-3 flex-row items-center gap-2">
                    <View className="flex-1 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2">
                      <Text className="font-inter-medium text-[10px] uppercase tracking-wide text-teal-700">
                        This device
                      </Text>
                      <Text className="mt-0.5 font-inter-bold text-lg text-teal-800">
                        {localValue}
                      </Text>
                    </View>
                    <Feather name="arrow-right" size={14} color="#CBD5E1" />
                    <View className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <Text className="font-inter-medium text-[10px] uppercase tracking-wide text-slate-500">
                        Server
                      </Text>
                      <Text className="mt-0.5 font-inter-bold text-lg text-slate-800">
                        {serverValue}
                      </Text>
                    </View>
                  </View>

                  {resolving ? (
                    <View className="mt-3 h-11 flex-row items-center justify-center gap-2 rounded-xl bg-slate-50">
                      <ActivityIndicator size="small" color="#0F766E" />
                      <Text className="font-inter-medium text-xs text-slate-600">
                        Saving…
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-3 flex-row gap-2">
                      <TouchableOpacity
                        className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-teal-700 ${
                          busy ? "opacity-50" : ""
                        }`}
                        disabled={busy}
                        activeOpacity={0.8}
                        onPress={() => onResolve(conflict, "local")}
                        accessibilityRole="button"
                        accessibilityLabel={`Keep this device's value ${localValue} for ${name}`}
                      >
                        <Feather name="smartphone" size={14} color="#FFFFFF" />
                        <Text className="font-inter-semibold text-xs text-white">
                          Keep mine · {localValue}
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
                        accessibilityLabel={`Use the server value ${serverValue} for ${name}`}
                      >
                        <Feather name="cloud" size={14} color="#334155" />
                        <Text className="font-inter-semibold text-xs text-slate-700">
                          Use server · {serverValue}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center justify-center gap-1.5 border-t border-slate-100 px-5 pt-3">
            <Feather name="lock" size={11} color="#94A3B8" />
            <Text className="font-inter text-[11px] text-slate-500">
              Closes once every entry is resolved
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};
