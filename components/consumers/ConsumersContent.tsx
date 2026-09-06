import Feather from "@expo/vector-icons/Feather";
import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddMealConsumerModal } from "@/components/meals/AddMealConsumerModal";
import { useAuth, useNetwork } from "@/redux/hooks";
import { getConsumers } from "@/services/consumerService";
import type { Consumer } from "@/types/consumer";
import { ConsumersHeader } from "./ConsumersHeader";
import { ConsumersList } from "./ConsumersList";

type Toast = { type: "success" | "error"; message: string };

export const ConsumersContent = ({
  returnTo = "dashboard",
}: {
  returnTo?: "dashboard" | "manager";
}) => {
  const insets = useSafeAreaInsets();
  const { token, activeMess, role } = useAuth();
  const { isOnline } = useNetwork();
  const [consumers, setConsumers] = useState<Consumer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const messId = activeMess?.id;

  const showToast = (next: Toast) => {
    setToast(next);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchConsumers = useCallback(async () => {
    if (!token || !messId) return;

    setLoading(true);
    try {
      setConsumers(await getConsumers(token, messId));
    } catch {
      // Preserve the last successfully loaded list when refreshing fails.
    } finally {
      setLoading(false);
    }
  }, [messId, token]);

  useEffect(() => {
    void fetchConsumers();
  }, [fetchConsumers]);

  const handlePullToRefresh = async () => {
    if (!token || !messId) return;

    if (!isOnline) {
      showToast({
        type: "error",
        message: "Refresh failed. Check your internet connection.",
      });
      return;
    }

    setRefreshing(true);
    try {
      setConsumers(await getConsumers(token, messId));
      showToast({ type: "success", message: "Members refreshed" });
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Refresh failed. Please try again.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View
      className={`flex-1 bg-slate-50 ${Platform.OS === "web" ? "" : "pt-safe"}`}
    >
      <StatusBar style="light" backgroundColor="#0F766E" />
      {Platform.OS !== "web" && (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 top-0 z-50 bg-teal-700"
          style={{ height: insets.top }}
        />
      )}
      <ConsumersHeader
        returnTo={returnTo}
        loading={loading}
        totalConsumers={consumers.length}
      />
      <ConsumersList
        consumers={consumers}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => void handlePullToRefresh()}
        onDeleted={(consumerId) =>
          setConsumers((currentConsumers) =>
            currentConsumers.filter((consumer) => consumer.id !== consumerId),
          )
        }
      />
      {role === "admin" && (
        <TouchableOpacity
          className="absolute right-5 h-14 flex-row items-center gap-2 rounded-full bg-teal-700 pl-4 pr-5 shadow-lg shadow-teal-950/40"
          style={{ bottom: Math.max(insets.bottom, 16) + 16 }}
          onPress={() => setShowAddMember(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add new member"
        >
          <Feather name="user-plus" size={18} color="#FFFFFF" />
          <Text className="font-inter-semibold text-[13px] text-white">
            Add Member
          </Text>
        </TouchableOpacity>
      )}
      <AddMealConsumerModal
        visible={showAddMember}
        onClose={() => setShowAddMember(false)}
        onAdded={fetchConsumers}
      />
      {toast && (
        <View
          pointerEvents="none"
          className="absolute bottom-24 left-0 right-0 z-50 items-center"
        >
          <View
            className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 shadow-md ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 shadow-emerald-900/15"
                : "border-red-200 bg-red-50 shadow-red-900/15"
            }`}
          >
            <Feather
              name={toast.type === "success" ? "check-circle" : "alert-circle"}
              size={15}
              color={toast.type === "success" ? "#059669" : "#DC2626"}
            />
            <Text
              className={`font-inter-semibold text-xs ${
                toast.type === "success" ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {toast.message}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
