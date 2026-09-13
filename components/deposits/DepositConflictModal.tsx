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
import type {
  DepositConflict,
  DepositSnapshot,
} from "@/offline/features/deposits/conflicts";
import { formatDepositAmount, formatDepositTimestamp } from "@/utils/deposit";

const formatShortDate = (isoDate: string): string =>
  new Date(isoDate).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });

const describe = (conflict: DepositConflict) => {
  const local = `৳${formatDepositAmount(conflict.local.amount)}`;
  const server = conflict.server
    ? `৳${formatDepositAmount(conflict.server.amount)}`
    : "";
  if (!conflict.server) {
    return {
      badge: "Deleted on another device",
      badgeClassName: "bg-red-50",
      badgeTextClassName: "text-red-700",
      keepLabel: `Add again · ${local}`,
      keepIcon: "plus" as const,
      serverLabel: "Accept delete",
      serverIcon: "trash-2" as const,
    };
  }
  if (conflict.localAction === "delete") {
    return {
      badge: "You deleted it, another admin edited it",
      badgeClassName: "bg-amber-50",
      badgeTextClassName: "text-amber-800",
      keepLabel: "Delete anyway",
      keepIcon: "trash-2" as const,
      serverLabel: `Keep · ${server}`,
      serverIcon: "cloud" as const,
    };
  }
  return {
    badge: "Edited on both devices",
    badgeClassName: "bg-amber-50",
    badgeTextClassName: "text-amber-800",
    keepLabel: `Keep mine · ${local}`,
    keepIcon: "smartphone" as const,
    serverLabel: `Use server · ${server}`,
    serverIcon: "cloud" as const,
  };
};

const VersionBox = ({
  label,
  snapshot,
  tone,
}: {
  label: string;
  snapshot: DepositSnapshot | null;
  tone: "local" | "server";
}) => (
  <View
    className={`flex-1 rounded-xl border px-3 py-2 ${
      tone === "local"
        ? "border-teal-200 bg-teal-50"
        : "border-slate-200 bg-slate-50"
    }`}
  >
    <Text
      className={`font-inter-medium text-[10px] uppercase tracking-wide ${
        tone === "local" ? "text-teal-700" : "text-slate-500"
      }`}
    >
      {label}
    </Text>
    {snapshot ? (
      <>
        <Text
          className={`mt-0.5 font-inter-bold text-lg ${
            tone === "local" ? "text-teal-800" : "text-slate-800"
          }`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          ৳{formatDepositAmount(snapshot.amount)}
        </Text>
        <Text
          className="font-inter text-[10px] text-slate-500"
          numberOfLines={1}
        >
          {formatDepositTimestamp(snapshot.depositedAt)}
        </Text>
        {snapshot.note ? (
          <Text
            className="font-inter text-[10px] text-slate-500"
            numberOfLines={1}
          >
            {snapshot.note}
          </Text>
        ) : null}
      </>
    ) : (
      <View className="mt-1 flex-row items-center gap-1.5">
        <Feather name="trash-2" size={14} color="#94A3B8" />
        <Text className="font-inter-semibold text-[15px] text-slate-400">
          Deleted
        </Text>
      </View>
    )}
  </View>
);

interface DepositConflictModalProps {
  conflicts: DepositConflict[];
  consumers: Array<{ id: string; name: string }>;
  resolvingId: string | null;
  onResolve: (
    conflict: DepositConflict,
    resolution: "local" | "server",
  ) => void;
}

export const DepositConflictModal = ({
  conflicts,
  consumers,
  resolvingId,
  onResolve,
}: DepositConflictModalProps) => {
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
                  <Feather name="credit-card" size={10} color="#0F766E" />
                  <Text className="font-inter-semibold text-[10px] uppercase tracking-wide text-teal-700">
                    Deposits page · Deposit entries
                  </Text>
                </View>
                <Text className="font-inter-bold text-[16px] text-slate-900">
                  Deposit conflict
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
              deposit entries on the Deposits page, so your change has not been
              saved to the server yet.
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
                    Green button
                  </Text>{" "}
                  — apply the change you made on this phone.
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
                    White button
                  </Text>{" "}
                  — keep what the other admin saved.
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
              const name =
                consumers.find(
                  (consumer) => consumer.id === String(conflict.consumerId),
                )?.name ?? `Consumer ${conflict.consumerId}`;
              const resolving = resolvingId === conflict.localId;
              const busy = resolvingId !== null;
              const copy = describe(conflict);

              return (
                <View
                  key={conflict.localId}
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
                        {formatShortDate(conflict.local.depositedAt)}
                      </Text>
                    </View>
                  </View>

                  <View
                    className={`mt-2.5 self-start rounded-full px-2.5 py-1 ${copy.badgeClassName}`}
                  >
                    <Text
                      className={`font-inter-semibold text-[11px] ${copy.badgeTextClassName}`}
                    >
                      {copy.badge}
                    </Text>
                  </View>

                  <View className="mt-2.5 flex-row items-center gap-2">
                    <VersionBox
                      label="This device"
                      tone="local"
                      snapshot={
                        conflict.localAction === "delete"
                          ? null
                          : conflict.local
                      }
                    />
                    <Feather name="arrow-right" size={14} color="#CBD5E1" />
                    <VersionBox
                      label="Server"
                      tone="server"
                      snapshot={conflict.server}
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
                    <View className="mt-3 flex-row gap-2">
                      <TouchableOpacity
                        className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-teal-700 ${
                          busy ? "opacity-50" : ""
                        }`}
                        disabled={busy}
                        activeOpacity={0.8}
                        onPress={() => onResolve(conflict, "local")}
                        accessibilityRole="button"
                        accessibilityLabel={`${copy.keepLabel} for ${name}`}
                      >
                        <Feather
                          name={copy.keepIcon}
                          size={14}
                          color="#FFFFFF"
                        />
                        <Text
                          className="font-inter-semibold text-xs text-white"
                          numberOfLines={1}
                        >
                          {copy.keepLabel}
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
                        accessibilityLabel={`${copy.serverLabel} for ${name}`}
                      >
                        <Feather
                          name={copy.serverIcon}
                          size={14}
                          color="#334155"
                        />
                        <Text
                          className="font-inter-semibold text-xs text-slate-700"
                          numberOfLines={1}
                        >
                          {copy.serverLabel}
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
