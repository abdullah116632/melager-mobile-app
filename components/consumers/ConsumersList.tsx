import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  ToastAndroid,
  View,
} from "react-native";
import { RemoveMemberConfirmModal } from "@/components/RemoveMemberConfirmModal";
import { useAuth } from "@/redux/hooks";
import { deleteConsumer } from "@/services/consumerService";
import type { Consumer } from "@/types/consumer";
import { ConsumerSearchBar } from "./ConsumerSearchBar";
import { ConsumerDetailModal } from "./ConsumerDetailModal";
import { ConsumerTableSection } from "./ConsumerTableSection";
import { ConsumersEmptyState } from "./ConsumersEmptyState";

interface ConsumersListProps {
  consumers: Consumer[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onDeleted: (consumerId: number) => void;
}

const showCopiedMessage = (label: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(`${label} copied`, ToastAndroid.SHORT);
  } else if (Platform.OS === "ios") {
    Alert.alert("Copied", `${label} copied to clipboard`);
  }
};

export const ConsumersList = ({
  consumers,
  loading,
  refreshing,
  onRefresh,
  onDeleted,
}: ConsumersListProps) => {
  const { token, activeMess } = useAuth();
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Consumer | null>(null);
  const [selectedConsumer, setSelectedConsumer] = useState<Consumer | null>(
    null,
  );
  const messId = activeMess?.id;

  const copy = async (value: string, key: string, label: string) => {
    await Clipboard.setStringAsync(value);
    showCopiedMessage(label);
    setCopiedId(key);
    setTimeout(() => {
      setCopiedId((previousId) => (previousId === key ? null : previousId));
    }, 1500);
  };

  const remove = async (consumerId: number) => {
    if (!token || !messId || deletingId !== null) return;

    setDeletingId(consumerId);
    try {
      await deleteConsumer(consumerId, token, messId);
      onDeleted(consumerId);
      setPendingDelete(null);
    } catch (caughtError: unknown) {
      Alert.alert(
        "Error",
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to delete member.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (consumer: Consumer) => {
    setPendingDelete(consumer);
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredConsumers = consumers.filter((consumer) => {
    if (!normalizedSearch) return true;
    return (
      (consumer.email?.toLowerCase().includes(normalizedSearch) ?? false) ||
      (consumer.mobileNumber?.toLowerCase().includes(normalizedSearch) ??
        false) ||
      consumer.name.toLowerCase().includes(normalizedSearch)
    );
  });
  const registeredConsumers = filteredConsumers.filter(
    (consumer) => consumer.userId != null && !consumer.accountDeletedAt,
  );
  const manuallyAddedConsumers = filteredConsumers.filter(
    (consumer) => consumer.userId == null && !consumer.accountDeletedAt,
  );
  const deletedAccountConsumers = filteredConsumers.filter((consumer) =>
    Boolean(consumer.accountDeletedAt),
  );

  return (
    <>
      <ConsumerSearchBar
        search={search}
        onSearchChange={setSearch}
        onClear={() => setSearch("")}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow pb-safe-offset-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0F766E"
            colors={["#0F766E"]}
          />
        }
      >
        {loading ? (
          <View className="flex-1 items-center justify-center gap-3 px-8">
            <ActivityIndicator size="large" color="#0F766E" />
          </View>
        ) : consumers.length === 0 ? (
          <ConsumersEmptyState
            icon="users"
            iconSize={52}
            title="No members yet"
            description="Add members from the Meals tab."
          />
        ) : filteredConsumers.length === 0 ? (
          <ConsumersEmptyState
            icon="search"
            iconSize={40}
            title="No results"
            description="Try a different name, email or phone."
          />
        ) : (
          <>
            {registeredConsumers.length > 0 && (
              <ConsumerTableSection
                label="REGISTERED MEMBERS"
                consumers={registeredConsumers}
                copiedId={copiedId}
                onCopy={copy}
                onDelete={confirmDelete}
                onSelect={setSelectedConsumer}
                deletingId={deletingId}
              />
            )}
            {manuallyAddedConsumers.length > 0 && (
              <ConsumerTableSection
                label="MANUALLY ADDED"
                consumers={manuallyAddedConsumers}
                copiedId={copiedId}
                onCopy={copy}
                topMargin={registeredConsumers.length > 0}
                onDelete={confirmDelete}
                onSelect={setSelectedConsumer}
                deletingId={deletingId}
              />
            )}
            {deletedAccountConsumers.length > 0 && (
              <ConsumerTableSection
                label="DELETED ACCOUNTS"
                consumers={deletedAccountConsumers}
                copiedId={copiedId}
                onCopy={copy}
                topMargin={
                  registeredConsumers.length > 0 ||
                  manuallyAddedConsumers.length > 0
                }
                onDelete={confirmDelete}
                onSelect={setSelectedConsumer}
                deletingId={deletingId}
              />
            )}
          </>
        )}
      </ScrollView>

      <RemoveMemberConfirmModal
        member={
          pendingDelete
            ? { id: String(pendingDelete.id), name: pendingDelete.name }
            : null
        }
        loading={pendingDelete !== null && deletingId === pendingDelete.id}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void remove(pendingDelete.id);
        }}
      />
      <ConsumerDetailModal
        consumer={selectedConsumer}
        onClose={() => setSelectedConsumer(null)}
      />
    </>
  );
};
